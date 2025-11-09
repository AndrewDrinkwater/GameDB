import {
  Campaign,
  Character,
  Entity,
  EntityNote,
  User,
  UserCampaignRole,
} from '../models/index.js'
import { checkWorldAccess } from '../middleware/worldAccess.js'
import {
  buildEntityReadContext,
  canUserReadEntity,
} from '../utils/entityAccess.js'

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

export const extractMentions = (content) => {
  if (typeof content !== 'string' || !content.includes('@')) return []

  const regex = /@\[(.+?)]\(([^)]+)\)/g
  const mentions = []
  const seen = new Set()
  let match

  while ((match = regex.exec(content)) !== null) {
    const rawLabel = match[1] ?? ''
    const rawId = match[2] ?? ''
    const entityId = normaliseId(rawId)
    if (!entityId) continue

    const label = normaliseString(rawLabel).trim()
    const key = `${entityId}:${label}`
    if (seen.has(key)) continue
    seen.add(key)

    mentions.push({ entityId, entityName: label || null })
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
          if (!entityId) return null
          const entityName =
            mention?.entityName ?? mention?.entity_name ?? mention?.label ?? ''
          return {
            entityId,
            entityName,
          }
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

    const mentions = extractMentions(content)

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
