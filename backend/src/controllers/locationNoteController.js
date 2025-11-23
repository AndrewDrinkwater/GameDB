import {
  Campaign,
  Character,
  Entity,
  Location,
  LocationNote,
  User,
  UserCampaignRole,
} from '../models/index.js'
import { checkWorldAccess } from '../middleware/worldAccess.js'
import {
  notifyEntityComment,
  notifyEntityMentions,
} from '../utils/notificationService.js'

const findCampaignMembership = async (campaignId, userId) => {
  if (!campaignId || !userId) return null

  const membership = await UserCampaignRole.findOne({
    where: { campaign_id: campaignId, user_id: userId },
    attributes: ['role', 'user_id'],
  })

  if (!membership) return null
  return membership.get({ plain: true })
}

const SHARE_TYPES = new Set(['private', 'companions', 'dm', 'party'])
const PLAYER_SHARE_TYPES = new Set(['private', 'companions', 'dm'])
const DM_SHARE_TYPES = new Set(['private', 'party'])

export const normaliseString = (value) => {
  if (value === null || value === undefined) return ''
  if (typeof value !== 'string') return String(value)
  return value
}

export const normaliseId = (value) => {
  const str = normaliseString(value).trim()
  return str || null
}

export const resolveCampaignId = (req) => {
  const candidates = [
    req.query?.campaignId,
    req.query?.campaign_id,
    req.body?.campaignId,
    req.body?.campaign_id,
    req.campaignContextId,
  ]

  for (const candidate of candidates) {
    const resolved = normaliseId(candidate)
    if (resolved) return resolved
  }

  return null
}

export const normaliseShareType = (value) => {
  if (value === null || value === undefined) return 'private'
  const str = normaliseString(value).trim().toLowerCase()
  if (!SHARE_TYPES.has(str)) {
    throw new Error(
      `Share type must be one of: ${Array.from(SHARE_TYPES).join(', ')}`,
    )
  }
  return str
}

export const extractMentions = async (content) => {
  if (typeof content !== 'string' || !content.includes('@')) return []

  const regex = /@\[(.+?)]\(([^)]+)\)/g
  const mentions = []
  const seen = new Set()
  let match

  while ((match = regex.exec(content)) !== null) {
    const rawLabel = match[1] ?? ''
    const rawId = match[2] ?? ''
    const label = normaliseString(rawLabel).trim()
    
    // Check if ID has a type prefix (entity:UUID or location:UUID)
    let mentionId = normaliseId(rawId)
    let mentionType = null
    
    if (mentionId && mentionId.includes(':')) {
      const parts = mentionId.split(':')
      if (parts.length === 2) {
        mentionType = parts[0]
        mentionId = normaliseId(parts[1])
      }
    }
    
    if (!mentionId) continue

    const key = `${mentionId}:${label}`
    if (seen.has(key)) continue
    seen.add(key)

    // If type is specified, use it; otherwise try to determine from database
    if (mentionType === 'entity') {
      mentions.push({ entityId: mentionId, entityName: label || null, type: 'entity' })
    } else if (mentionType === 'location') {
      mentions.push({ locationId: mentionId, locationName: label || null, type: 'location' })
    } else {
      // Backward compatibility: try to determine type by checking database
      // Check entity first (most common)
      const entity = await Entity.findByPk(mentionId).catch(() => null)
      if (entity) {
        mentions.push({ entityId: mentionId, entityName: label || null, type: 'entity' })
      } else {
        // Check location
        const location = await Location.findByPk(mentionId).catch(() => null)
        if (location) {
          mentions.push({ locationId: mentionId, locationName: label || null, type: 'location' })
        } else {
          // Default to entity for backward compatibility
          mentions.push({ entityId: mentionId, entityName: label || null, type: 'entity' })
        }
      }
    }
  }

  return mentions
}

const formatNoteRecord = (note) => {
  if (!note) return null
  const plain =
    typeof note.get === 'function' ? note.get({ plain: true }) : { ...note }

  const mentions = Array.isArray(plain.mentions)
    ? plain.mentions
        .map((mention) => {
          const entityId =
            mention?.entityId ?? mention?.entity_id ?? mention?.id ?? null
          const locationId =
            mention?.locationId ?? mention?.location_id ?? mention?.id ?? null
          const targetId = entityId || locationId
          if (!targetId) return null
          const entityName =
            mention?.entityName ?? mention?.entity_name ?? mention?.label ?? ''
          const locationName =
            mention?.locationName ?? mention?.location_name ?? mention?.label ?? ''
          return {
            entityId: entityId || null,
            locationId: locationId || null,
            entityName: entityId ? entityName : null,
            locationName: locationId ? locationName : null,
          }
        })
        .filter(Boolean)
    : []

  const payload = {
    id: plain.id,
    locationId: plain.location_id,
    location_id: plain.location_id,
    campaignId: plain.campaign_id,
    campaign_id: plain.campaign_id,
    characterId: plain.character_id ?? null,
    character_id: plain.character_id ?? null,
    createdBy: plain.created_by,
    created_by: plain.created_by,
    shareType: plain.share_type,
    share_type: plain.share_type,
    content: plain.content ?? '',
    mentions,
    createdAt: plain.created_at,
    created_at: plain.created_at,
    updatedAt: plain.updated_at,
    updated_at: plain.updated_at,
  }

  if (plain.location) {
    const locationPlain =
      typeof plain.location.get === 'function'
        ? plain.location.get({ plain: true })
        : plain.location

    payload.location = {
      id: locationPlain.id,
      name: locationPlain.name,
      locationTypeId: locationPlain.location_type_id ?? locationPlain.locationTypeId ?? null,
      location_type_id:
        locationPlain.location_type_id ?? locationPlain.locationTypeId ?? null,
    }
  }

  if (plain.author) {
    const authorPlain =
      typeof plain.author.get === 'function'
        ? plain.author.get({ plain: true })
        : plain.author

    payload.author = {
      id: authorPlain.id,
      username: authorPlain.username ?? '',
      email: authorPlain.email ?? '',
      role: authorPlain.role ?? null,
    }
  }

  if (plain.character) {
    const characterPlain =
      typeof plain.character.get === 'function'
        ? plain.character.get({ plain: true })
        : plain.character

    payload.character = {
      id: characterPlain.id,
      name: characterPlain.name ?? '',
    }
  }

  return payload
}

const collectIdFilters = (source, keys) => {
  const values = new Set()

  keys.forEach((key) => {
    if (!Object.prototype.hasOwnProperty.call(source, key)) return

    const rawValue = source[key]
    if (Array.isArray(rawValue)) {
      rawValue.forEach((entry) => {
        const resolved = normaliseId(entry)
        if (resolved) values.add(resolved)
      })
      return
    }

    if (typeof rawValue === 'string' && rawValue.includes(',')) {
      rawValue
        .split(',')
        .map((entry) => normaliseId(entry))
        .filter(Boolean)
        .forEach((entry) => values.add(entry))
      return
    }

    const resolved = normaliseId(rawValue)
    if (resolved) values.add(resolved)
  })

  return Array.from(values)
}

// Simplified location access check - locations use similar access control to entities
const canUserReadLocation = (location, user, worldAccess) => {
  if (!location) return false
  if (worldAccess?.isOwner || worldAccess?.isAdmin) return true
  if (worldAccess?.hasAccess) {
    // Basic check - if user has world access and location is visible
    if (location.visibility === 'hidden') return false
    if (location.read_access === 'hidden') return false
    if (location.read_access === 'global' || !location.read_access) return true
    // For selective access, we'd need more context, but for notes we'll allow if they have world access
    return true
  }
  return false
}

export const getLocationNotes = async (req, res) => {
  try {
    const { id } = req.params
    const campaignId = resolveCampaignId(req)

    if (!campaignId) {
      return res
        .status(400)
        .json({ success: false, message: 'Campaign id is required to view notes' })
    }

    const location = await Location.findByPk(id)
    if (!location) {
      return res
        .status(404)
        .json({ success: false, message: 'Location not found' })
    }

    const access = await checkWorldAccess(location.world_id, req.user)
    if (!access.world) {
      return res
        .status(404)
        .json({ success: false, message: 'World not found' })
    }

    if (!canUserReadLocation(location, req.user, access)) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    const campaign = await Campaign.findByPk(campaignId, {
      include: [
        {
          model: UserCampaignRole,
          as: 'members',
          attributes: ['user_id', 'role'],
        },
      ],
    })

    if (!campaign) {
      return res
        .status(404)
        .json({ success: false, message: 'Campaign not found' })
    }

    if (
      campaign.world_id &&
      location.world_id &&
      String(campaign.world_id) !== String(location.world_id)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Campaign must belong to the same world as the location',
      })
    }

    const userId = normaliseId(req.user?.id)
    const isSystemAdmin = req.user?.role === 'system_admin'

    let membershipRole = null
    if (!isSystemAdmin && userId) {
      const membership = Array.isArray(campaign.members)
        ? campaign.members.find((member) =>
            member && String(member.user_id) === String(userId),
          )
        : await findCampaignMembership(campaignId, userId)

      membershipRole = membership?.role ?? null
    }

    const isCampaignDm = isSystemAdmin || membershipRole === 'dm'
    const isCampaignPlayer = membershipRole === 'player'

    if (!isCampaignDm && !isCampaignPlayer) {
      return res.status(403).json({
        success: false,
        message: 'You must be part of this campaign to view notes',
      })
    }

    const notes = await LocationNote.findAll({
      where: { location_id: location.id, campaign_id: campaign.id },
      include: [
        { model: User, as: 'author', attributes: ['id', 'username', 'email', 'role'] },
        { model: Character, as: 'character', attributes: ['id', 'name'] },
      ],
      order: [['created_at', 'DESC']],
    })

    const filtered = notes.filter((note) => {
      if (isSystemAdmin || isCampaignDm) return true

      const plain =
        typeof note.get === 'function' ? note.get({ plain: true }) : note
      const creatorId = plain.created_by ? String(plain.created_by) : null
      if (userId && creatorId && creatorId === userId) return true

      const shareType = plain.share_type
      if (shareType === 'party') return true
      if (shareType === 'companions' && isCampaignPlayer) return true
      return false
    })

    const payload = filtered.map((note) => formatNoteRecord(note))
    return res.json({ success: true, data: payload })
  } catch (err) {
    console.error('❌ Failed to fetch location notes', err)
    return res
      .status(500)
      .json({ success: false, message: err.message || 'Failed to load notes' })
  }
}

export const createLocationNote = async (req, res) => {
  try {
    const { id } = req.params
    const campaignId = resolveCampaignId(req)

    if (!campaignId) {
      return res
        .status(400)
        .json({ success: false, message: 'Campaign id is required to add a note' })
    }

    const location = await Location.findByPk(id)
    if (!location) {
      return res
        .status(404)
        .json({ success: false, message: 'Location not found' })
    }

    const access = await checkWorldAccess(location.world_id, req.user)
    if (!access.world) {
      return res
        .status(404)
        .json({ success: false, message: 'World not found' })
    }

    if (!canUserReadLocation(location, req.user, access)) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    const campaign = await Campaign.findByPk(campaignId, {
      include: [
        {
          model: UserCampaignRole,
          as: 'members',
          attributes: ['user_id', 'role'],
        },
      ],
    })

    if (!campaign) {
      return res
        .status(404)
        .json({ success: false, message: 'Campaign not found' })
    }

    if (
      campaign.world_id &&
      location.world_id &&
      String(campaign.world_id) !== String(location.world_id)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Campaign must belong to the same world as the location',
      })
    }

    const userId = normaliseId(req.user?.id)
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: 'Authentication required' })
    }

    const isSystemAdmin = req.user?.role === 'system_admin'

    let membershipRole = null
    if (!isSystemAdmin) {
      const membership = Array.isArray(campaign.members)
        ? campaign.members.find((member) =>
            member && String(member.user_id) === String(userId),
          )
        : await findCampaignMembership(campaignId, userId)

      membershipRole = membership?.role ?? null
    }

    const isCampaignDm = isSystemAdmin || membershipRole === 'dm'
    const isCampaignPlayer = membershipRole === 'player'

    if (!isCampaignDm && !isCampaignPlayer) {
      return res.status(403).json({
        success: false,
        message: 'You must be a DM or player in this campaign to add notes',
      })
    }

    let shareType
    try {
      shareType = normaliseShareType(
        req.body?.shareType ?? req.body?.share_type ?? 'private',
      )
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message })
    }

    const allowedShares = isCampaignDm ? DM_SHARE_TYPES : PLAYER_SHARE_TYPES
    if (!allowedShares.has(shareType)) {
      return res.status(400).json({
        success: false,
        message: `Share type must be one of: ${Array.from(allowedShares).join(', ')}`,
      })
    }

    const contentInput = req.body?.content
    if (typeof contentInput !== 'string') {
      return res
        .status(400)
        .json({ success: false, message: 'Note content is required' })
    }

    const content = contentInput.trim()
    if (!content) {
      return res
        .status(400)
        .json({ success: false, message: 'Note content cannot be empty' })
    }

    let characterId = null
    if (isCampaignPlayer) {
      const rawCharacterId = normaliseId(
        req.body?.characterId ?? req.body?.character_id,
      )
      if (!rawCharacterId) {
        return res.status(400).json({
          success: false,
          message: 'A character must be selected for player notes',
        })
      }

      const character = await Character.findOne({
        where: {
          id: rawCharacterId,
          campaign_id: campaign.id,
          user_id: userId,
        },
      })

      if (!character) {
        return res.status(404).json({
          success: false,
          message: 'Character not found for this campaign',
        })
      }

      characterId = character.id
    }

    const mentions = await extractMentions(content)

    const note = await LocationNote.create({
      location_id: location.id,
      campaign_id: campaign.id,
      character_id: characterId,
      created_by: userId,
      share_type: shareType,
      content,
      mentions,
    })

    const payload = await LocationNote.findByPk(note.id, {
      include: [
        { model: User, as: 'author', attributes: ['id', 'username', 'email', 'role'] },
        { model: Character, as: 'character', attributes: ['id', 'name'] },
      ],
    })

    // Trigger notifications asynchronously (don't block response)
    // Note: We'll need to extend notification service for locations
    ;(async () => {
      try {
        // For now, skip location-specific notifications
        // TODO: Add notifyLocationComment and notifyLocationMentions
      } catch (notificationErr) {
        console.error('❌ Failed to send notifications for location note', notificationErr)
      }
    })()

    return res
      .status(201)
      .json({ success: true, data: formatNoteRecord(payload) })
  } catch (err) {
    console.error('❌ Failed to create location note', err)
    return res
      .status(500)
      .json({ success: false, message: err.message || 'Failed to create note' })
  }
}

export const updateLocationNote = async (req, res) => {
  try {
    const { id, noteId } = req.params
    const campaignId = resolveCampaignId(req)

    if (!campaignId) {
      return res
        .status(400)
        .json({ success: false, message: 'Campaign id is required to update a note' })
    }

    const location = await Location.findByPk(id)
    if (!location) {
      return res
        .status(404)
        .json({ success: false, message: 'Location not found' })
    }

    const access = await checkWorldAccess(location.world_id, req.user)
    if (!access.world) {
      return res
        .status(404)
        .json({ success: false, message: 'World not found' })
    }

    if (!canUserReadLocation(location, req.user, access)) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    const campaign = await Campaign.findByPk(campaignId, {
      include: [
        {
          model: UserCampaignRole,
          as: 'members',
          attributes: ['user_id', 'role'],
        },
      ],
    })

    if (!campaign) {
      return res
        .status(404)
        .json({ success: false, message: 'Campaign not found' })
    }

    if (
      campaign.world_id &&
      location.world_id &&
      String(campaign.world_id) !== String(location.world_id)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Campaign must belong to the same world as the location',
      })
    }

    const userId = normaliseId(req.user?.id)
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: 'Authentication required' })
    }

    const note = await LocationNote.findOne({
      where: {
        id: noteId,
        location_id: location.id,
        campaign_id: campaign.id,
      },
    })

    if (!note) {
      return res
        .status(404)
        .json({ success: false, message: 'Note not found' })
    }

    // Check if user is the author
    const noteAuthorId = normaliseId(note.created_by)
    if (!noteAuthorId || String(noteAuthorId) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Only the author can edit this note',
      })
    }

    const isSystemAdmin = req.user?.role === 'system_admin'

    let membershipRole = null
    if (!isSystemAdmin) {
      const membership = Array.isArray(campaign.members)
        ? campaign.members.find((member) =>
            member && String(member.user_id) === String(userId),
          )
        : await findCampaignMembership(campaignId, userId)

      membershipRole = membership?.role ?? null
    }

    const isCampaignDm = isSystemAdmin || membershipRole === 'dm'
    const isCampaignPlayer = membershipRole === 'player'

    if (!isCampaignDm && !isCampaignPlayer) {
      return res.status(403).json({
        success: false,
        message: 'You must be a DM or player in this campaign to edit notes',
      })
    }

    let shareType
    try {
      shareType = normaliseShareType(
        req.body?.shareType ?? req.body?.share_type ?? note.share_type,
      )
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message })
    }

    const allowedShares = isCampaignDm ? DM_SHARE_TYPES : PLAYER_SHARE_TYPES
    if (!allowedShares.has(shareType)) {
      return res.status(400).json({
        success: false,
        message: `Share type must be one of: ${Array.from(allowedShares).join(', ')}`,
      })
    }

    const contentInput = req.body?.content
    if (typeof contentInput !== 'string') {
      return res
        .status(400)
        .json({ success: false, message: 'Note content is required' })
    }

    const content = contentInput.trim()
    if (!content) {
      return res
        .status(400)
        .json({ success: false, message: 'Note content cannot be empty' })
    }

    // For players, validate character if it was originally set
    let validatedCharacterId = note.character_id
    if (isCampaignPlayer && note.character_id) {
      const rawCharacterId = normaliseId(
        req.body?.characterId ?? req.body?.character_id ?? note.character_id,
      )
      if (!rawCharacterId) {
        return res.status(400).json({
          success: false,
          message: 'A character must be selected for player notes',
        })
      }

      const character = await Character.findOne({
        where: {
          id: rawCharacterId,
          campaign_id: campaign.id,
          user_id: userId,
        },
      })

      if (!character) {
        return res.status(404).json({
          success: false,
          message: 'Character not found for this campaign',
        })
      }

      validatedCharacterId = character.id
    }

    const mentions = await extractMentions(content)

    // Update the note
    await note.update({
      content,
      share_type: shareType,
      mentions,
      ...(validatedCharacterId !== undefined ? { character_id: validatedCharacterId } : {}),
    })

    const payload = await LocationNote.findByPk(note.id, {
      include: [
        { model: User, as: 'author', attributes: ['id', 'username', 'email', 'role'] },
        { model: Character, as: 'character', attributes: ['id', 'name'] },
      ],
    })

    return res.json({ success: true, data: formatNoteRecord(payload) })
  } catch (err) {
    console.error('❌ Failed to update location note', err)
    return res
      .status(500)
      .json({ success: false, message: err.message || 'Failed to update note' })
  }
}

export const deleteLocationNote = async (req, res) => {
  try {
    const { id, noteId } = req.params
    const campaignId = resolveCampaignId(req)

    if (!campaignId) {
      return res
        .status(400)
        .json({ success: false, message: 'Campaign id is required to delete a note' })
    }

    const location = await Location.findByPk(id)
    if (!location) {
      return res
        .status(404)
        .json({ success: false, message: 'Location not found' })
    }

    const access = await checkWorldAccess(location.world_id, req.user)
    if (!access.world) {
      return res
        .status(404)
        .json({ success: false, message: 'World not found' })
    }

    if (!canUserReadLocation(location, req.user, access)) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    const campaign = await Campaign.findByPk(campaignId, {
      include: [
        {
          model: UserCampaignRole,
          as: 'members',
          attributes: ['user_id', 'role'],
        },
      ],
    })

    if (!campaign) {
      return res
        .status(404)
        .json({ success: false, message: 'Campaign not found' })
    }

    if (
      campaign.world_id &&
      location.world_id &&
      String(campaign.world_id) !== String(location.world_id)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Campaign must belong to the same world as the location',
      })
    }

    const userId = normaliseId(req.user?.id)
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: 'Authentication required' })
    }

    const note = await LocationNote.findOne({
      where: {
        id: noteId,
        location_id: location.id,
        campaign_id: campaign.id,
      },
    })

    if (!note) {
      return res
        .status(404)
        .json({ success: false, message: 'Note not found' })
    }

    // Check if user is the author
    const noteAuthorId = normaliseId(note.created_by)
    if (!noteAuthorId || String(noteAuthorId) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Only the author can delete this note',
      })
    }

    await note.destroy()

    return res.json({ success: true, data: { id: noteId } })
  } catch (err) {
    console.error('❌ Failed to delete location note', err)
    return res
      .status(500)
      .json({ success: false, message: err.message || 'Failed to delete note' })
  }
}

export const listCampaignLocationNotes = async (req, res) => {
  try {
    const campaignId = normaliseId(req.params?.id ?? req.params?.campaignId)

    if (!campaignId) {
      return res
        .status(400)
        .json({ success: false, message: 'Campaign id is required' })
    }

    const campaign = await Campaign.findByPk(campaignId, {
      include: [
        {
          model: UserCampaignRole,
          as: 'members',
          attributes: ['user_id', 'role'],
        },
      ],
    })

    if (!campaign) {
      return res
        .status(404)
        .json({ success: false, message: 'Campaign not found' })
    }

    const userId = normaliseId(req.user?.id)
    const isSystemAdmin = req.user?.role === 'system_admin'

    let membershipRole = null
    if (!isSystemAdmin && userId) {
      const membership = Array.isArray(campaign.members)
        ? campaign.members.find(
            (member) => member && String(member.user_id) === String(userId),
          )
        : await findCampaignMembership(campaignId, userId)

      membershipRole = membership?.role ?? null
    }

    const isCampaignDm = isSystemAdmin || membershipRole === 'dm'
    const isCampaignPlayer = membershipRole === 'player'

    if (!isCampaignDm && !isCampaignPlayer) {
      return res.status(403).json({
        success: false,
        message: 'You must be part of this campaign to view notes',
      })
    }

    const where = { campaign_id: campaign.id }

    const locationFilters = collectIdFilters(req.query ?? {}, [
      'locationId',
      'location_id',
      'locationIds',
      'location_ids',
      'locationIds[]',
      'location_ids[]',
    ])

    if (locationFilters.length === 1) {
      where.location_id = locationFilters[0]
    } else if (locationFilters.length > 1) {
      where.location_id = locationFilters
    }

    const authorFilters = collectIdFilters(req.query ?? {}, [
      'authorId',
      'author_id',
      'authorIds',
      'author_ids',
      'authorIds[]',
      'author_ids[]',
      'createdBy',
      'created_by',
    ])

    if (authorFilters.length === 1) {
      where.created_by = authorFilters[0]
    } else if (authorFilters.length > 1) {
      where.created_by = authorFilters
    }

    const notes = await LocationNote.findAll({
      where,
      include: [
        {
          model: Location,
          as: 'location',
          attributes: ['id', 'name', 'location_type_id', 'world_id'],
          required: true,
        },
        { model: User, as: 'author', attributes: ['id', 'username', 'email', 'role'] },
        { model: Character, as: 'character', attributes: ['id', 'name'] },
      ],
      order: [['created_at', 'DESC']],
    })

    const filtered = notes.filter((note) => {
      if (isSystemAdmin || isCampaignDm) return true

      const plain =
        typeof note.get === 'function' ? note.get({ plain: true }) : note
      const creatorId = plain.created_by ? String(plain.created_by) : null
      if (userId && creatorId && creatorId === userId) return true

      const shareType = plain.share_type
      if (shareType === 'party') return true
      if (shareType === 'companions' && isCampaignPlayer) return true
      return false
    })

    const payload = filtered.map((note) => formatNoteRecord(note))
    return res.json({ success: true, data: payload })
  } catch (err) {
    console.error('❌ Failed to fetch campaign location notes', err)
    return res
      .status(500)
      .json({ success: false, message: err.message || 'Failed to load notes' })
  }
}

export const listLocationMentionNotes = async (req, res) => {
  try {
    const { id } = req.params
    const campaignId = resolveCampaignId(req)

    if (!campaignId) {
      return res.status(400).json({
        success: false,
        message: 'Campaign id is required to view mentions',
      })
    }

    const location = await Location.findByPk(id)
    if (!location) {
      return res.status(404).json({ success: false, message: 'Location not found' })
    }

    const access = await checkWorldAccess(location.world_id, req.user)
    if (!access.world) {
      return res.status(404).json({ success: false, message: 'World not found' })
    }

    if (!canUserReadLocation(location, req.user, access)) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    const campaign = await Campaign.findByPk(campaignId, {
      include: [
        {
          model: UserCampaignRole,
          as: 'members',
          attributes: ['user_id', 'role'],
        },
      ],
    })

    if (!campaign) {
      return res
        .status(404)
        .json({ success: false, message: 'Campaign not found' })
    }

    if (
      campaign.world_id &&
      location.world_id &&
      String(campaign.world_id) !== String(location.world_id)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Campaign must belong to the same world as the location',
      })
    }

    const userId = normaliseId(req.user?.id)
    const isSystemAdmin = req.user?.role === 'system_admin'

    let membershipRole = null
    if (!isSystemAdmin && userId) {
      const membership = Array.isArray(campaign.members)
        ? campaign.members.find(
            (member) => member && String(member.user_id) === String(userId),
          )
        : await findCampaignMembership(campaignId, userId)

      membershipRole = membership?.role ?? null
    }

    const isCampaignDm = isSystemAdmin || membershipRole === 'dm'
    const isCampaignPlayer = membershipRole === 'player'

    if (!isCampaignDm && !isCampaignPlayer) {
      return res.status(403).json({
        success: false,
        message: 'You must be part of this campaign to view notes',
      })
    }

    const notes = await LocationNote.findAll({
      where: { campaign_id: campaign.id },
      include: [
        {
          model: Location,
          as: 'location',
          attributes: ['id', 'name', 'location_type_id', 'world_id'],
        },
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'email', 'role'],
        },
        { model: Character, as: 'character', attributes: ['id', 'name'] },
      ],
      order: [['created_at', 'DESC']],
    })

    const mentionId = normaliseId(id)

    const filtered = notes.filter((note) => {
      const plain =
        typeof note.get === 'function' ? note.get({ plain: true }) : note

      if (!Array.isArray(plain.mentions)) {
        return false
      }

      const hasMention = plain.mentions.some((mention) => {
        const mentionLocationId = normaliseId(
          mention?.locationId ??
            mention?.location_id ??
            mention?.id ??
            mention?.locationID ??
            null,
        )
        if (mentionLocationId && mentionLocationId === mentionId) {
          return true
        }
        // Also check for entity mentions (in case location ID matches an entity ID - unlikely but possible)
        const mentionEntityId = normaliseId(
          mention?.entityId ??
            mention?.entity_id ??
            mention?.id ??
            mention?.entityID ??
            null,
        )
        return mentionEntityId && mentionEntityId === mentionId
      })

      if (!hasMention) {
        return false
      }

      if (isSystemAdmin || isCampaignDm) {
        return true
      }

      const creatorId = plain.created_by ? String(plain.created_by) : null
      if (userId && creatorId && creatorId === userId) {
        return true
      }

      const shareType = plain.share_type
      if (shareType === 'party') {
        return true
      }

      if (shareType === 'companions' && isCampaignPlayer) {
        return true
      }

      return false
    })

    const payload = filtered.map((note) => formatNoteRecord(note))
    return res.json({ success: true, data: payload })
  } catch (err) {
    console.error('❌ Failed to fetch location mention notes', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to load mentions',
    })
  }
}

