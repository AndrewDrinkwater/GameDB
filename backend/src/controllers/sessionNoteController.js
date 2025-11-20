import {
  Campaign,
  Entity,
  SessionNote,
  User,
  UserCampaignRole,
} from '../models/index.js'
import {
  extractMentions,
  normaliseId,
  normaliseString,
} from './entityNoteController.js'
import { checkWorldAccess } from '../middleware/worldAccess.js'
import { buildEntityReadContext, canUserReadEntity } from '../utils/entityAccess.js'
import {
  notifySessionNoteAdded,
  notifyEntityMentions,
} from '../utils/notificationService.js'

const normaliseDateOnly = (value) => {
  const raw = normaliseString(value).trim()
  if (!raw) return null

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw
  }

  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date.toISOString().slice(0, 10)
}

const todayDateString = () => new Date().toISOString().slice(0, 10)

const findCampaignMembership = async (campaignId, userId) => {
  if (!campaignId || !userId) return null

  const membership = await UserCampaignRole.findOne({
    where: { campaign_id: campaignId, user_id: userId },
    attributes: ['role', 'user_id'],
  })

  if (!membership) return null
  return membership.get({ plain: true })
}

const ensureCampaignAccess = async (campaignId, user) => {
  const resolvedCampaignId = normaliseId(campaignId)
  if (!resolvedCampaignId) {
    return {
      error: { status: 400, message: 'Campaign id is required' },
    }
  }

  const campaign = await Campaign.findByPk(resolvedCampaignId, {
    include: [
      {
        model: UserCampaignRole,
        as: 'members',
        attributes: ['user_id', 'role'],
      },
    ],
  })

  if (!campaign) {
    return {
      error: { status: 404, message: 'Campaign not found' },
    }
  }

  const userId = normaliseId(user?.id)
  const isSystemAdmin = user?.role === 'system_admin'

  let membershipRole = null
  if (!isSystemAdmin && userId) {
    const membership = Array.isArray(campaign.members)
      ? campaign.members.find(
          (member) => member && String(member.user_id) === String(userId),
        )
      : await findCampaignMembership(campaign.id, userId)

    membershipRole = membership?.role ?? null
  }

  const isCampaignDm = isSystemAdmin || membershipRole === 'dm'
  const isCampaignPlayer = membershipRole === 'player'

  if (!isCampaignDm && !isCampaignPlayer) {
    return {
      error: {
        status: 403,
        message: 'You must be part of this campaign to access session notes',
      },
    }
  }

  return {
    campaign,
    userId,
    isSystemAdmin,
    membershipRole,
  }
}

const formatMentionList = (mentions) => {
  if (!Array.isArray(mentions)) return []

  return mentions
    .map((mention) => {
      const entityId =
        mention?.entityId ?? mention?.entity_id ?? mention?.id ?? mention?.entityID
      if (!entityId) return null

      const entityName =
        mention?.entityName ?? mention?.entity_name ?? mention?.label ?? ''

      return {
        entityId,
        entity_id: entityId,
        entityName,
        entity_name: entityName,
      }
    })
    .filter(Boolean)
}

const formatSessionNoteRecord = (note) => {
  if (!note) return null
  const plain = typeof note.get === 'function' ? note.get({ plain: true }) : { ...note }

  const payload = {
    id: plain.id,
    campaignId: plain.campaign_id,
    campaign_id: plain.campaign_id,
    sessionDate: plain.session_date,
    session_date: plain.session_date,
    sessionTitle: plain.session_title,
    session_title: plain.session_title,
    content: plain.content ?? '',
    mentions: formatMentionList(plain.mentions),
    createdBy: plain.created_by,
    created_by: plain.created_by,
    updatedBy: plain.updated_by ?? null,
    updated_by: plain.updated_by ?? null,
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

  if (plain.lastEditor) {
    const editorPlain =
      typeof plain.lastEditor.get === 'function'
        ? plain.lastEditor.get({ plain: true })
        : plain.lastEditor

    payload.lastEditor = {
      id: editorPlain.id,
      username: editorPlain.username,
      email: editorPlain.email,
      role: editorPlain.role,
    }
  } else {
    payload.lastEditor = null
  }

  return payload
}

export const listCampaignSessionNotes = async (req, res) => {
  try {
    const campaignId = req.params?.id ?? req.params?.campaignId
    const access = await ensureCampaignAccess(campaignId, req.user)
    if (access.error) {
      return res.status(access.error.status).json({
        success: false,
        message: access.error.message,
      })
    }

    const notes = await SessionNote.findAll({
      where: { campaign_id: access.campaign.id },
      include: [
        { model: User, as: 'author', attributes: ['id', 'username', 'email', 'role'] },
        { model: User, as: 'lastEditor', attributes: ['id', 'username', 'email', 'role'] },
      ],
      order: [
        ['session_date', 'DESC'],
        ['updated_at', 'DESC'],
      ],
    })

    const payload = notes.map((note) => formatSessionNoteRecord(note))
    return res.json({ success: true, data: payload })
  } catch (err) {
    console.error('❌ Failed to fetch session notes', err)
    return res
      .status(500)
      .json({ success: false, message: err.message || 'Failed to load session notes' })
  }
}

export const listEntityMentionSessionNotes = async (req, res) => {
  try {
    const { id } = req.params
    const entityId = normaliseId(id)
    if (!entityId) {
      return res.status(400).json({
        success: false,
        message: 'Entity id is required to view mentions',
      })
    }

    const rawCampaignId =
      req.query?.campaignId || req.query?.campaign_id || req.campaignContextId
    const campaignId = normaliseId(rawCampaignId)

    if (!campaignId) {
      return res.status(400).json({
        success: false,
        message: 'Campaign id is required to view mentions',
      })
    }

    const entity = await Entity.findByPk(entityId)
    if (!entity) {
      return res.status(404).json({ success: false, message: 'Entity not found' })
    }

    const access = await ensureCampaignAccess(campaignId, req.user)
    if (access.error) {
      return res.status(access.error.status).json({
        success: false,
        message: access.error.message,
      })
    }

    if (
      access.campaign.world_id &&
      entity.world_id &&
      String(access.campaign.world_id) !== String(entity.world_id)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Campaign must belong to the same world as the entity',
      })
    }

    const worldAccess = await checkWorldAccess(entity.world_id, req.user)
    if (!worldAccess.world) {
      return res
        .status(404)
        .json({ success: false, message: 'World not found' })
    }

    const readContext = await buildEntityReadContext({
      worldId: entity.world_id,
      user: req.user,
      worldAccess,
      campaignContextId: access.campaign.id,
    })

    if (!canUserReadEntity(entity, readContext)) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    const notes = await SessionNote.findAll({
      where: { campaign_id: access.campaign.id },
      include: [
        { model: User, as: 'author', attributes: ['id', 'username', 'email', 'role'] },
        { model: User, as: 'lastEditor', attributes: ['id', 'username', 'email', 'role'] },
      ],
      order: [
        ['session_date', 'DESC'],
        ['updated_at', 'DESC'],
      ],
    })

    const filtered = notes.filter((note) => {
      const plain =
        typeof note.get === 'function' ? note.get({ plain: true }) : note

      if (!Array.isArray(plain.mentions)) {
        return false
      }

      return plain.mentions.some((mention) => {
        const mentionId = normaliseId(
          mention?.entityId ??
            mention?.entity_id ??
            mention?.id ??
            mention?.entityID ??
            null,
        )
        return mentionId && mentionId === entityId
      })
    })

    const payload = filtered.map((note) => formatSessionNoteRecord(note))
    return res.json({ success: true, data: payload })
  } catch (err) {
    console.error('❌ Failed to fetch session note mentions', err)
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to load mentions',
    })
  }
}

export const createCampaignSessionNote = async (req, res) => {
  try {
    const campaignId = req.params?.id ?? req.params?.campaignId
    const access = await ensureCampaignAccess(campaignId, req.user)
    if (access.error) {
      return res.status(access.error.status).json({
        success: false,
        message: access.error.message,
      })
    }

    const userId = access.userId
    if (!userId) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    const titleRaw = req.body?.sessionTitle ?? req.body?.session_title
    const contentRaw = req.body?.content
    const dateRaw = req.body?.sessionDate ?? req.body?.session_date

    const sessionTitle = normaliseString(titleRaw).trim() || 'Session note'
    const content = normaliseString(contentRaw)
    const sessionDate = normaliseDateOnly(dateRaw) || todayDateString()

    const note = await SessionNote.create({
      campaign_id: access.campaign.id,
      session_title: sessionTitle,
      session_date: sessionDate,
      content,
      mentions: extractMentions(content),
      created_by: userId,
      updated_by: userId,
    })

    const created = await SessionNote.findByPk(note.id, {
      include: [
        { model: User, as: 'author', attributes: ['id', 'username', 'email', 'role'] },
        { model: User, as: 'lastEditor', attributes: ['id', 'username', 'email', 'role'] },
      ],
    })

    // Trigger notifications asynchronously (don't block response)
    ;(async () => {
      try {
        const mentions = extractMentions(content)

        // Notify all campaign members when session note is added
        await notifySessionNoteAdded(created, access.campaign.id)

        // Notify mentioned entity followers
        if (mentions && Array.isArray(mentions) && mentions.length > 0) {
          await notifyEntityMentions(
            content,
            mentions,
            access.campaign.id,
            'session_note',
            note.id,
            userId,
          )
        }
      } catch (notificationErr) {
        console.error('❌ Failed to send notifications for session note', notificationErr)
        // Don't fail the request if notifications fail
      }
    })()

    return res
      .status(201)
      .json({ success: true, data: formatSessionNoteRecord(created) })
  } catch (err) {
    console.error('❌ Failed to create session note', err)
    return res
      .status(500)
      .json({ success: false, message: err.message || 'Failed to create session note' })
  }
}

export const updateCampaignSessionNote = async (req, res) => {
  try {
    const campaignId = req.params?.id ?? req.params?.campaignId
    const noteId = req.params?.noteId ?? req.params?.sessionNoteId
    const access = await ensureCampaignAccess(campaignId, req.user)
    if (access.error) {
      return res.status(access.error.status).json({
        success: false,
        message: access.error.message,
      })
    }

    const resolvedNoteId = normaliseId(noteId)
    if (!resolvedNoteId) {
      return res
        .status(400)
        .json({ success: false, message: 'Session note id is required' })
    }

    const note = await SessionNote.findOne({
      where: { id: resolvedNoteId, campaign_id: access.campaign.id },
      include: [
        { model: User, as: 'author', attributes: ['id', 'username', 'email', 'role'] },
        { model: User, as: 'lastEditor', attributes: ['id', 'username', 'email', 'role'] },
      ],
    })

    if (!note) {
      return res
        .status(404)
        .json({ success: false, message: 'Session note not found' })
    }

    const titleRaw = req.body?.sessionTitle ?? req.body?.session_title
    const contentRaw = req.body?.content
    const dateRaw = req.body?.sessionDate ?? req.body?.session_date

    const sessionTitle = normaliseString(titleRaw).trim() || note.session_title
    const content = normaliseString(contentRaw)
    const sessionDate = normaliseDateOnly(dateRaw) || note.session_date || todayDateString()

    await note.update({
      session_title: sessionTitle,
      session_date: sessionDate,
      content,
      mentions: extractMentions(content),
      updated_by: access.userId ?? note.updated_by,
    })

    await note.reload({
      include: [
        { model: User, as: 'author', attributes: ['id', 'username', 'email', 'role'] },
        { model: User, as: 'lastEditor', attributes: ['id', 'username', 'email', 'role'] },
      ],
    })

    return res.json({ success: true, data: formatSessionNoteRecord(note) })
  } catch (err) {
    console.error('❌ Failed to update session note', err)
    return res
      .status(500)
      .json({ success: false, message: err.message || 'Failed to update session note' })
  }
}

export const deleteCampaignSessionNote = async (req, res) => {
  try {
    const campaignId = req.params?.id ?? req.params?.campaignId
    const noteId = req.params?.noteId ?? req.params?.sessionNoteId
    const access = await ensureCampaignAccess(campaignId, req.user)
    if (access.error) {
      return res.status(access.error.status).json({
        success: false,
        message: access.error.message,
      })
    }

    if (!access.isSystemAdmin && access.membershipRole !== 'dm') {
      return res.status(403).json({
        success: false,
        message: 'Only Dungeon Masters can delete session notes',
      })
    }

    const resolvedNoteId = normaliseId(noteId)
    if (!resolvedNoteId) {
      return res
        .status(400)
        .json({ success: false, message: 'Session note id is required' })
    }

    const note = await SessionNote.findOne({
      where: { id: resolvedNoteId, campaign_id: access.campaign.id },
    })

    if (!note) {
      return res
        .status(404)
        .json({ success: false, message: 'Session note not found' })
    }

    await note.destroy()

    return res.json({ success: true, data: { id: resolvedNoteId } })
  } catch (err) {
    console.error('❌ Failed to delete session note', err)
    return res
      .status(500)
      .json({ success: false, message: err.message || 'Failed to delete session note' })
  }
}
