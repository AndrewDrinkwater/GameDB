import {
  Notification,
  EntityFollow,
  Entity,
  User,
  Campaign,
  UserCampaignRole,
  Request,
} from '../models/index.js'
import { checkWorldAccess } from '../middleware/worldAccess.js'
import {
  buildEntityReadContext,
  canUserReadEntity,
} from './entityAccess.js'

const normaliseId = (value) => {
  if (!value) return null
  const str = String(value).trim()
  return str || null
}

// Simple in-memory cache to track last notification time per note
const lastNotificationCache = new Map()

// Minimum time between notifications for the same note (5 minutes)
const NOTIFICATION_DEBOUNCE_MS = 5 * 60 * 1000

/**
 * Generic notification creation function
 * @param {string} userId - User to notify
 * @param {string} type - Notification type (extensible string)
 * @param {object} metadata - JSONB metadata with context
 * @param {string} campaignId - Optional campaign context
 * @param {string} actionUrl - Optional deep link URL
 */
export const createNotification = async (
  userId,
  type,
  metadata = {},
  campaignId = null,
  actionUrl = null,
) => {
  if (!userId || !type) {
    console.warn('⚠️ Cannot create notification: missing userId or type')
    return null
  }

  try {
    const notification = await Notification.create({
      user_id: userId,
      type,
      campaign_id: campaignId,
      metadata,
      action_url: actionUrl,
      read: false,
    })

    return notification
  } catch (err) {
    console.error('❌ Failed to create notification', err)
    return null
  }
}

/**
 * Check if user can see entity in campaign context
 * @param {string} entityId - Entity ID
 * @param {string} userId - User ID
 * @param {string} campaignId - Campaign ID
 */
export const canUserSeeEntityInContext = async (entityId, userId, campaignId) => {
  if (!entityId || !userId || !campaignId) return false

  try {
    const entity = await Entity.findByPk(entityId)
    if (!entity) return false

    const access = await checkWorldAccess(entity.world_id, { id: userId })
    if (!access.world) return false

    const readContext = await buildEntityReadContext({
      worldId: entity.world_id,
      user: { id: userId },
      worldAccess: access,
      campaignContextId: campaignId,
    })

    return canUserReadEntity(entity, readContext)
  } catch (err) {
    console.error('❌ Failed to check entity visibility', err)
    return false
  }
}

/**
 * Notify followers when entity note is created
 * @param {object} entityNote - EntityNote record
 * @param {string} campaignId - Campaign ID
 */
export const notifyEntityComment = async (entityNote, campaignId) => {
  if (!entityNote || !campaignId) return

  const entityId = normaliseId(entityNote.entity_id || entityNote.entityId)
  const authorId = normaliseId(entityNote.created_by || entityNote.createdBy)
  if (!entityId) return

  try {
    // Get entity name for metadata
    const entity = await Entity.findByPk(entityId)
    const entityName = entity?.name || 'Unnamed entity'

    // Get author name
    const author = await User.findByPk(authorId)
    const authorName = author?.username || author?.email || 'Unknown'

    // Find all users who follow this entity in this campaign
    const follows = await EntityFollow.findAll({
      where: {
        entity_id: entityId,
        campaign_id: campaignId,
      },
      include: [{ model: User, as: 'user', attributes: ['id'] }],
    })

    // Create notifications for followers (excluding the author)
    const notificationPromises = follows
      .map((follow) => {
        const followerId = normaliseId(follow.user_id || follow.user?.id)
        if (!followerId || followerId === authorId) return null

        const metadata = {
          entity_id: entityId,
          entity_name: entityName,
          entity_note_id: normaliseId(entityNote.id),
          author_id: authorId,
          author_name: authorName,
          target_id: entityId,
          target_type: 'entity',
        }

        const actionUrl = `/entities/${entityId}?campaignId=${campaignId}#notes`

        return createNotification(
          followerId,
          'entity_comment',
          metadata,
          campaignId,
          actionUrl,
        )
      })
      .filter(Boolean)

    await Promise.all(notificationPromises)
  } catch (err) {
    console.error('❌ Failed to notify entity comment', err)
  }
}

/**
 * Notify followers when entity is mentioned
 * @param {string} content - Note content with mentions
 * @param {array} mentions - Array of mention objects {entityId, entityName}
 * @param {string} campaignId - Campaign ID
 * @param {string} noteType - 'entity_note' or 'session_note'
 * @param {string} noteId - Note ID
 * @param {string} authorId - Author ID (optional)
 */
export const notifyEntityMentions = async (
  content,
  mentions,
  campaignId,
  noteType,
  noteId,
  authorId = null,
) => {
  if (!mentions || !Array.isArray(mentions) || mentions.length === 0 || !campaignId) return
  if (!noteType || !noteId) return

  try {
    // Get author name if provided
    let authorName = 'Unknown'
    if (authorId) {
      const author = await User.findByPk(authorId)
      authorName = author?.username || author?.email || 'Unknown'
    }

    // Process each mention
    for (const mention of mentions) {
      const mentionedEntityId = normaliseId(
        mention.entityId || mention.entity_id || mention.id,
      )
      if (!mentionedEntityId) continue

      // Check if user can see this entity in the campaign context
      // We'll check this per follower when notifying
      const mentionedEntity = await Entity.findByPk(mentionedEntityId)
      if (!mentionedEntity) continue

      const entityName = mentionedEntity?.name || mention.entityName || 'Unnamed entity'

      // Find all users who follow this entity in this campaign
      const follows = await EntityFollow.findAll({
        where: {
          entity_id: mentionedEntityId,
          campaign_id: campaignId,
        },
        include: [{ model: User, as: 'user', attributes: ['id'] }],
      })

      // Create notifications for followers (excluding the author if provided)
      for (const follow of follows) {
        const followerId = normaliseId(follow.user_id || follow.user?.id)
        if (!followerId || (authorId && followerId === authorId)) continue

        // Verify follower can see the mentioned entity
        const canSee = await canUserSeeEntityInContext(mentionedEntityId, followerId, campaignId)
        if (!canSee) continue

        const notificationType =
          noteType === 'entity_note'
            ? 'entity_mention_entity_note'
            : 'entity_mention_session_note'

        const metadata = {
          related_entity_id: mentionedEntityId,
          related_entity_name: entityName,
          target_id: noteType === 'entity_note' ? mentionedEntityId : campaignId,
          target_type: noteType === 'entity_note' ? 'entity' : 'campaign',
          [noteType === 'entity_note' ? 'entity_note_id' : 'session_note_id']: normaliseId(noteId),
          author_id: authorId,
          author_name: authorName,
        }

        const actionUrl =
          noteType === 'entity_note'
            ? `/entities/${mentionedEntityId}?campaignId=${campaignId}#notes`
            : `/notes/session?campaignId=${campaignId}`

        await createNotification(followerId, notificationType, metadata, campaignId, actionUrl)
      }
    }
  } catch (err) {
    console.error('❌ Failed to notify entity mentions', err)
  }
}

/**
 * Notify all campaign members when session note is added
 * @param {object} sessionNote - SessionNote record
 * @param {string} campaignId - Campaign ID
 */
export const notifySessionNoteAdded = async (sessionNote, campaignId) => {
  if (!sessionNote || !campaignId) return

  const authorId = normaliseId(sessionNote.created_by || sessionNote.createdBy)
  const noteId = normaliseId(sessionNote.id)

  try {
    // Get campaign with members
    const campaign = await Campaign.findByPk(campaignId, {
      include: [
        {
          model: UserCampaignRole,
          as: 'members',
          attributes: ['user_id', 'role'],
          include: [{ model: User, as: 'user', attributes: ['id', 'username', 'email'] }],
        },
      ],
    })

    if (!campaign || !Array.isArray(campaign.members)) return

    // Get author name
    let authorName = 'Unknown'
    if (authorId) {
      const author = await User.findByPk(authorId)
      authorName = author?.username || author?.email || 'Unknown'
    }

    const sessionTitle = sessionNote.session_title || sessionNote.sessionTitle || 'Session note'
    const sessionDate = sessionNote.session_date || sessionNote.sessionDate || ''
    const campaignName = campaign.name || 'Campaign'

    // Create notifications for all campaign members (excluding the author)
    const notificationPromises = campaign.members
      .map((member) => {
        const memberUserId = normaliseId(
          member.user_id || member.userId || member.user?.id,
        )
        if (!memberUserId || memberUserId === authorId) return null

        const metadata = {
          session_note_id: noteId,
          session_title: sessionTitle,
          session_date: sessionDate,
          campaign_id: campaignId,
          campaign_name: campaignName,
          author_id: authorId,
          author_name: authorName,
          target_id: campaignId,
          target_type: 'campaign',
        }

        const actionUrl = `/notes/session?campaignId=${campaignId}`

        return createNotification(
          memberUserId,
          'session_note_added',
          metadata,
          campaignId,
          actionUrl,
        )
      })
      .filter(Boolean)

    await Promise.all(notificationPromises)
  } catch (err) {
    console.error('❌ Failed to notify session note added', err)
  }
}

/**
 * Notify all campaign members when session note is updated
 * @param {object} sessionNote - SessionNote record
 * @param {string} campaignId - Campaign ID
 */
export const notifySessionNoteUpdated = async (sessionNote, campaignId) => {
  if (!sessionNote || !campaignId) return

  const editorId = normaliseId(sessionNote.updated_by || sessionNote.updatedBy || sessionNote.created_by || sessionNote.createdBy)
  const noteId = normaliseId(sessionNote.id)

  // Check cache for recent notification
  const cacheKey = `session_note_${noteId}`
  const lastNotified = lastNotificationCache.get(cacheKey)
  const now = Date.now()

  if (lastNotified && (now - lastNotified) < NOTIFICATION_DEBOUNCE_MS) {
    // Too soon since last notification, skip to prevent spam
    return
  }

  try {
    // Get campaign with members
    const campaign = await Campaign.findByPk(campaignId, {
      include: [
        {
          model: UserCampaignRole,
          as: 'members',
          attributes: ['user_id', 'role'],
          include: [{ model: User, as: 'user', attributes: ['id', 'username', 'email'] }],
        },
      ],
    })

    if (!campaign || !Array.isArray(campaign.members)) return

    // Get editor name
    let editorName = 'Unknown'
    if (editorId) {
      const editor = await User.findByPk(editorId)
      editorName = editor?.username || editor?.email || 'Unknown'
    }

    const sessionTitle = sessionNote.session_title || sessionNote.sessionTitle || 'Session note'
    const sessionDate = sessionNote.session_date || sessionNote.sessionDate || ''
    const campaignName = campaign.name || 'Campaign'

    // Create notifications for all campaign members (excluding the editor)
    const notificationPromises = campaign.members
      .map((member) => {
        const memberUserId = normaliseId(
          member.user_id || member.userId || member.user?.id,
        )
        if (!memberUserId || memberUserId === editorId) return null

        const metadata = {
          session_note_id: noteId,
          session_title: sessionTitle,
          session_date: sessionDate,
          campaign_id: campaignId,
          campaign_name: campaignName,
          author_id: editorId,
          author_name: editorName,
          target_id: campaignId,
          target_type: 'campaign',
        }

        const actionUrl = `/notes/session?campaignId=${campaignId}`

        return createNotification(
          memberUserId,
          'session_note_updated',
          metadata,
          campaignId,
          actionUrl,
        )
      })
      .filter(Boolean)

    await Promise.all(notificationPromises)

    // Update cache after successful notification
    lastNotificationCache.set(cacheKey, now)
  } catch (err) {
    console.error('❌ Failed to notify session note updated', err)
  }
}

/**
 * Notify request creator when request status changes
 * @param {object} request - Request record
 * @param {string} oldStatus - Previous status
 */
export const notifyRequestStatusChange = async (request, oldStatus) => {
  if (!request) return

  const requestId = normaliseId(request.id || request.request_id)
  const creatorId = normaliseId(request.created_by || request.createdBy)
  if (!requestId || !creatorId) return

  try {
    // Get request details if needed
    const requestData = request.id
      ? request
      : await Request.findByPk(requestId, {
          include: [{ model: User, as: 'creator', attributes: ['id', 'username', 'email'] }],
        })

    if (!requestData) return

    const requestTitle = requestData.title || 'Request'
    const newStatus = requestData.status || 'unknown'
    const creator = requestData.creator || requestData.creator_data

    const metadata = {
      request_id: requestId,
      request_title: requestTitle,
      old_status: oldStatus,
      new_status: newStatus,
      target_id: requestId,
      target_type: 'request',
    }

    const actionUrl = `/requests/${requestId}`

    await createNotification(creatorId, 'request_status_changed', metadata, null, actionUrl)
  } catch (err) {
    console.error('❌ Failed to notify request status change', err)
  }
}

/**
 * Notify request creator when a note is added to their request
 * @param {object} requestNote - RequestNote record
 * @param {string} requestId - Request ID
 */
export const notifyRequestNoteAdded = async (requestNote, requestId) => {
  if (!requestNote || !requestId) return

  const noteId = normaliseId(requestNote.id || requestNote.note_id)
  const authorId = normaliseId(requestNote.created_by || requestNote.createdBy)
  if (!noteId || !authorId) return

  try {
    // Get request to find creator
    const request = await Request.findByPk(requestId, {
      include: [{ model: User, as: 'creator', attributes: ['id', 'username', 'email'] }],
    })

    if (!request) return

    const creatorId = normaliseId(request.created_by)
    if (!creatorId || creatorId === authorId) {
      // Don't notify if creator is the one adding the note
      return
    }

    const requestTitle = request.title || 'Request'
    const author = requestNote.author || requestNote.author_data
    const authorName = author?.username || author?.email || 'Unknown'

    const metadata = {
      request_id: requestId,
      request_title: requestTitle,
      request_note_id: noteId,
      author_id: authorId,
      author_name: authorName,
      target_id: requestId,
      target_type: 'request',
    }

    const actionUrl = `/requests/${requestId}`

    await createNotification(creatorId, 'request_note_added', metadata, null, actionUrl)
  } catch (err) {
    console.error('❌ Failed to notify request note added', err)
  }
}

/**
 * Notify user when they are assigned to a request
 * @param {object} request - Request record
 * @param {string} oldAssignedTo - Previous assignee ID
 */
export const notifyRequestAssigned = async (request, oldAssignedTo) => {
  if (!request) return

  const requestId = normaliseId(request.id || request.request_id)
  const newAssignedTo = normaliseId(request.assigned_to || request.assignedTo)
  if (!requestId || !newAssignedTo) return

  // Don't notify if assignment didn't change or was removed
  if (newAssignedTo === oldAssignedTo) return

  try {
    // Get request details
    const requestData = request.id
      ? request
      : await Request.findByPk(requestId, {
          include: [
            { model: User, as: 'creator', attributes: ['id', 'username', 'email'] },
            { model: User, as: 'assignee', attributes: ['id', 'username', 'email'], required: false },
          ],
        })

    if (!requestData) return

    const requestTitle = requestData.title || 'Request'
    const creator = requestData.creator || requestData.creator_data
    const creatorName = creator?.username || creator?.email || 'Unknown'

    const metadata = {
      request_id: requestId,
      request_title: requestTitle,
      creator_id: normaliseId(requestData.created_by),
      creator_name: creatorName,
      target_id: requestId,
      target_type: 'request',
    }

    const actionUrl = `/requests/${requestId}`

    await createNotification(newAssignedTo, 'request_assigned', metadata, null, actionUrl)
  } catch (err) {
    console.error('❌ Failed to notify request assigned', err)
  }
}

