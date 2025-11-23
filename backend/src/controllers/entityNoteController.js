import {
  Campaign,
  Character,
  Entity,
  EntityNote,
  Location,
  User,
  UserCampaignRole,
} from '../models/index.js'
import { checkWorldAccess } from '../middleware/worldAccess.js'
import {
  buildEntityReadContext,
  canUserReadEntity,
} from '../utils/entityAccess.js'
import {
  notifyEntityComment,
  notifyEntityMentions,
} from '../utils/notificationService.js'

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

const findCampaignMembership = async (campaignId, userId) => {
  if (!campaignId || !userId) return null

  const membership = await UserCampaignRole.findOne({
    where: { campaign_id: campaignId, user_id: userId },
    attributes: ['role', 'user_id'],
  })

  if (!membership) return null
  return membership.get({ plain: true })
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
            mention?.locationId ?? mention?.location_id ?? null
          const mentionType = mention?.type ?? (locationId ? 'location' : 'entity')
          
          if (mentionType === 'location' && locationId) {
            const locationName =
              mention?.locationName ?? mention?.location_name ?? mention?.label ?? ''
            return {
              locationId,
              locationName,
              type: 'location',
            }
          }
          
          if (entityId) {
            const entityName =
              mention?.entityName ?? mention?.entity_name ?? mention?.label ?? ''
            return {
              entityId,
              entityName,
              type: 'entity',
            }
          }
          
          return null
        })
        .filter(Boolean)
    : []

  const payload = {
    id: plain.id,
    entityId: plain.entity_id,
    entity_id: plain.entity_id,
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

  if (plain.entity) {
    const entityPlain =
      typeof plain.entity.get === 'function'
        ? plain.entity.get({ plain: true })
        : plain.entity

    payload.entity = {
      id: entityPlain.id,
      name: entityPlain.name,
      entityTypeId: entityPlain.entity_type_id ?? entityPlain.entityTypeId ?? null,
      entity_type_id:
        entityPlain.entity_type_id ?? entityPlain.entityTypeId ?? null,
    }

    if (!payload.entityId) {
      payload.entityId = entityPlain.id
      payload.entity_id = entityPlain.id
    }

    payload.entityName = entityPlain.name ?? ''
  } else {
    payload.entity = null
    payload.entityName = ''
  }

  if (plain.author) {
    const authorPlain =
      typeof plain.author.get === 'function'
        ? plain.author.get({ plain: true })
        : plain.author

    payload.author = {
      id: authorPlain.id,
      username: authorPlain.username,
      email: authorPlain.email,
      role: authorPlain.role,
    }
  } else {
    payload.author = null
  }

  if (plain.character) {
    const characterPlain =
      typeof plain.character.get === 'function'
        ? plain.character.get({ plain: true })
        : plain.character

    payload.character = {
      id: characterPlain.id,
      name: characterPlain.name,
    }
  } else {
    payload.character = null
  }

  return payload
}

const collectIdFilters = (source, keys) => {
  if (!source || !keys || keys.length === 0) return []

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

export const getEntityNotes = async (req, res) => {
  try {
    const { id } = req.params
    const campaignId = resolveCampaignId(req)

    if (!campaignId) {
      return res
        .status(400)
        .json({ success: false, message: 'Campaign id is required to view notes' })
    }

    const entity = await Entity.findByPk(id)
    if (!entity) {
      return res
        .status(404)
        .json({ success: false, message: 'Entity not found' })
    }

    const access = await checkWorldAccess(entity.world_id, req.user)
    if (!access.world) {
      return res
        .status(404)
        .json({ success: false, message: 'World not found' })
    }

    const readContext = await buildEntityReadContext({
      worldId: entity.world_id,
      user: req.user,
      worldAccess: access,
      campaignContextId: campaignId,
    })

    if (!canUserReadEntity(entity, readContext)) {
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
      entity.world_id &&
      String(campaign.world_id) !== String(entity.world_id)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Campaign must belong to the same world as the entity',
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

    const notes = await EntityNote.findAll({
      where: { entity_id: entity.id, campaign_id: campaign.id },
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
    console.error('❌ Failed to fetch entity notes', err)
    return res
      .status(500)
      .json({ success: false, message: err.message || 'Failed to load notes' })
  }
}

export const listEntityMentionNotes = async (req, res) => {
  try {
    const { id } = req.params
    const campaignId = resolveCampaignId(req)

    if (!campaignId) {
      return res.status(400).json({
        success: false,
        message: 'Campaign id is required to view mentions',
      })
    }

    const entity = await Entity.findByPk(id)
    if (!entity) {
      return res.status(404).json({ success: false, message: 'Entity not found' })
    }

    const access = await checkWorldAccess(entity.world_id, req.user)
    if (!access.world) {
      return res.status(404).json({ success: false, message: 'World not found' })
    }

    const readContext = await buildEntityReadContext({
      worldId: entity.world_id,
      user: req.user,
      worldAccess: access,
      campaignContextId: campaignId,
    })

    if (!canUserReadEntity(entity, readContext)) {
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
      entity.world_id &&
      String(campaign.world_id) !== String(entity.world_id)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Campaign must belong to the same world as the entity',
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

    const notes = await EntityNote.findAll({
      where: { campaign_id: campaign.id },
      include: [
        {
          model: Entity,
          as: 'entity',
          attributes: ['id', 'name', 'entity_type_id', 'world_id'],
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
        // Check for entity mentions
        const mentionEntityId = normaliseId(
          mention?.entityId ??
            mention?.entity_id ??
            mention?.id ??
            mention?.entityID ??
            null,
        )
        if (mentionEntityId && mentionEntityId === mentionId) {
          return true
        }
        // Also check for location mentions (in case entity ID matches a location ID - unlikely but possible)
        const mentionLocationId = normaliseId(
          mention?.locationId ?? mention?.location_id ?? null,
        )
        return mentionLocationId && mentionLocationId === mentionId
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
    console.error('❌ Failed to fetch entity mention notes', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to load mentions',
    })
  }
}

export const createEntityNote = async (req, res) => {
  try {
    const { id } = req.params
    const campaignId = resolveCampaignId(req)

    if (!campaignId) {
      return res
        .status(400)
        .json({ success: false, message: 'Campaign id is required to add a note' })
    }

    const entity = await Entity.findByPk(id)
    if (!entity) {
      return res
        .status(404)
        .json({ success: false, message: 'Entity not found' })
    }

    const access = await checkWorldAccess(entity.world_id, req.user)
    if (!access.world) {
      return res
        .status(404)
        .json({ success: false, message: 'World not found' })
    }

    const readContext = await buildEntityReadContext({
      worldId: entity.world_id,
      user: req.user,
      worldAccess: access,
      campaignContextId: campaignId,
    })

    if (!canUserReadEntity(entity, readContext)) {
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
      entity.world_id &&
      String(campaign.world_id) !== String(entity.world_id)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Campaign must belong to the same world as the entity',
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

    const note = await EntityNote.create({
      entity_id: entity.id,
      campaign_id: campaign.id,
      character_id: characterId,
      created_by: userId,
      share_type: shareType,
      content,
      mentions,
    })

    const payload = await EntityNote.findByPk(note.id, {
      include: [
        { model: User, as: 'author', attributes: ['id', 'username', 'email', 'role'] },
        { model: Character, as: 'character', attributes: ['id', 'name'] },
      ],
    })

    // Trigger notifications asynchronously (don't block response)
    ;(async () => {
      try {
        // Notify followers when entity comment is added
        await notifyEntityComment(payload, campaignId)

        // Notify mentioned entity followers
        if (mentions && Array.isArray(mentions) && mentions.length > 0) {
          await notifyEntityMentions(
            content,
            mentions,
            campaignId,
            'entity_note',
            note.id,
            userId,
          )
        }
      } catch (notificationErr) {
        console.error('❌ Failed to send notifications for entity note', notificationErr)
        // Don't fail the request if notifications fail
      }
    })()

    return res
      .status(201)
      .json({ success: true, data: formatNoteRecord(payload) })
  } catch (err) {
    console.error('❌ Failed to create entity note', err)
    return res
      .status(500)
      .json({ success: false, message: err.message || 'Failed to create note' })
  }
}

export const listCampaignEntityNotes = async (req, res) => {
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

    const where = { campaign_id: campaign.id }

    const entityFilters = collectIdFilters(req.query ?? {}, [
      'entityId',
      'entity_id',
      'entityIds',
      'entity_ids',
      'entityIds[]',
      'entity_ids[]',
    ])

    if (entityFilters.length === 1) {
      where.entity_id = entityFilters[0]
    } else if (entityFilters.length > 1) {
      where.entity_id = entityFilters
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

    const notes = await EntityNote.findAll({
      where,
      include: [
        {
          model: Entity,
          as: 'entity',
          attributes: ['id', 'name', 'entity_type_id'],
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
    console.error('❌ Failed to fetch campaign entity notes', err)
    return res
      .status(500)
      .json({ success: false, message: err.message || 'Failed to load notes' })
  }
}

export const updateEntityNote = async (req, res) => {
  try {
    const { id, noteId } = req.params
    const campaignId = resolveCampaignId(req)

    if (!campaignId) {
      return res
        .status(400)
        .json({ success: false, message: 'Campaign id is required to update a note' })
    }

    const entity = await Entity.findByPk(id)
    if (!entity) {
      return res
        .status(404)
        .json({ success: false, message: 'Entity not found' })
    }

    const access = await checkWorldAccess(entity.world_id, req.user)
    if (!access.world) {
      return res
        .status(404)
        .json({ success: false, message: 'World not found' })
    }

    const readContext = await buildEntityReadContext({
      worldId: entity.world_id,
      user: req.user,
      worldAccess: access,
      campaignContextId: campaignId,
    })

    if (!canUserReadEntity(entity, readContext)) {
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
      entity.world_id &&
      String(campaign.world_id) !== String(entity.world_id)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Campaign must belong to the same world as the entity',
      })
    }

    const userId = normaliseId(req.user?.id)
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: 'Authentication required' })
    }

    const note = await EntityNote.findOne({
      where: {
        id: noteId,
        entity_id: entity.id,
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

    const payload = await EntityNote.findByPk(note.id, {
      include: [
        { model: User, as: 'author', attributes: ['id', 'username', 'email', 'role'] },
        { model: Character, as: 'character', attributes: ['id', 'name'] },
      ],
    })

    return res.json({ success: true, data: formatNoteRecord(payload) })
  } catch (err) {
    console.error('❌ Failed to update entity note', err)
    return res
      .status(500)
      .json({ success: false, message: err.message || 'Failed to update note' })
  }
}

export const deleteEntityNote = async (req, res) => {
  try {
    const { id, noteId } = req.params
    const campaignId = resolveCampaignId(req)

    if (!campaignId) {
      return res
        .status(400)
        .json({ success: false, message: 'Campaign id is required to delete a note' })
    }

    const entity = await Entity.findByPk(id)
    if (!entity) {
      return res
        .status(404)
        .json({ success: false, message: 'Entity not found' })
    }

    const access = await checkWorldAccess(entity.world_id, req.user)
    if (!access.world) {
      return res
        .status(404)
        .json({ success: false, message: 'World not found' })
    }

    const readContext = await buildEntityReadContext({
      worldId: entity.world_id,
      user: req.user,
      worldAccess: access,
      campaignContextId: campaignId,
    })

    if (!canUserReadEntity(entity, readContext)) {
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
      entity.world_id &&
      String(campaign.world_id) !== String(entity.world_id)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Campaign must belong to the same world as the entity',
      })
    }

    const userId = normaliseId(req.user?.id)
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: 'Authentication required' })
    }

    const note = await EntityNote.findOne({
      where: {
        id: noteId,
        entity_id: entity.id,
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
    console.error('❌ Failed to delete entity note', err)
    return res
      .status(500)
      .json({ success: false, message: err.message || 'Failed to delete note' })
  }
}