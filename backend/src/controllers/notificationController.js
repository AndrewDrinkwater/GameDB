import { Notification, User, Campaign } from '../models/index.js'
import { Op } from 'sequelize'

const normaliseId = (value) => {
  if (!value) return null
  const str = String(value).trim()
  return str || null
}

/**
 * Get paginated notifications for user
 * Supports filters: read, campaign_id, type
 */
export const getUserNotifications = async (req, res) => {
  try {
    const userId = normaliseId(req.user?.id)
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' })
    }

    const page = Math.max(1, parseInt(req.query?.page || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(req.query?.limit || '20', 10)))
    const offset = (page - 1) * limit

    const where = { user_id: userId }

    // Filter by read status
    if (req.query?.read !== undefined) {
      const readValue = String(req.query.read).toLowerCase()
      if (readValue === 'true') {
        where.read = true
      } else if (readValue === 'false') {
        where.read = false
      }
    }

    // Filter by campaign
    const campaignId = normaliseId(req.query?.campaignId || req.query?.campaign_id)
    if (campaignId) {
      where.campaign_id = campaignId
    }

    // Filter by type
    const type = req.query?.type
    if (type) {
      where.type = String(type)
    }

    const { count, rows } = await Notification.findAndCountAll({
      where,
      include: [
        { model: Campaign, as: 'campaign', attributes: ['id', 'name'] },
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset,
    })

    const formatted = rows.map((notification) => {
      const plain = typeof notification.get === 'function' ? notification.get({ plain: true }) : notification
      return {
        id: plain.id,
        type: plain.type,
        campaignId: plain.campaign_id,
        campaign: plain.campaign
          ? {
              id: plain.campaign.id,
              name: plain.campaign.name,
            }
          : null,
        read: plain.read,
        readAt: plain.read_at,
        metadata: plain.metadata || {},
        actionUrl: plain.action_url,
        createdAt: plain.created_at,
        updatedAt: plain.updated_at,
      }
    })

    return res.json({
      success: true,
      data: formatted,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit),
      },
    })
  } catch (err) {
    console.error('❌ Failed to get notifications', err)
    return res
      .status(500)
      .json({ success: false, message: err.message || 'Failed to load notifications' })
  }
}

/**
 * Get unread notification count
 * Supports filters: campaign_id, type
 */
export const getUnreadCount = async (req, res) => {
  try {
    const userId = normaliseId(req.user?.id)
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' })
    }

    const where = {
      user_id: userId,
      read: false,
    }

    // Filter by campaign
    const campaignId = normaliseId(req.query?.campaignId || req.query?.campaign_id)
    if (campaignId) {
      where.campaign_id = campaignId
    }

    // Filter by type
    const type = req.query?.type
    if (type) {
      where.type = String(type)
    }

    const count = await Notification.count({ where })

    return res.json({ success: true, count })
  } catch (err) {
    console.error('❌ Failed to get unread count', err)
    return res
      .status(500)
      .json({ success: false, message: err.message || 'Failed to get unread count' })
  }
}

/**
 * Mark single notification as read
 */
export const markNotificationRead = async (req, res) => {
  try {
    const userId = normaliseId(req.user?.id)
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' })
    }

    const notificationId = normaliseId(req.params?.id)
    if (!notificationId) {
      return res
        .status(400)
        .json({ success: false, message: 'Notification id is required' })
    }

    const notification = await Notification.findOne({
      where: {
        id: notificationId,
        user_id: userId,
      },
    })

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' })
    }

    if (!notification.read) {
      await notification.update({
        read: true,
        read_at: new Date(),
      })
    }

    const plain = typeof notification.get === 'function' ? notification.get({ plain: true }) : notification

    return res.json({
      success: true,
      data: {
        id: plain.id,
        read: plain.read,
        readAt: plain.read_at,
      },
    })
  } catch (err) {
    console.error('❌ Failed to mark notification read', err)
    return res
      .status(500)
      .json({ success: false, message: err.message || 'Failed to mark notification read' })
  }
}

/**
 * Mark all user notifications as read
 * Supports filters: campaign_id, type
 */
export const markAllNotificationsRead = async (req, res) => {
  try {
    const userId = normaliseId(req.user?.id)
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' })
    }

    const where = {
      user_id: userId,
      read: false,
    }

    // Filter by campaign
    const campaignId = normaliseId(req.body?.campaignId || req.body?.campaign_id || req.query?.campaignId || req.query?.campaign_id)
    if (campaignId) {
      where.campaign_id = campaignId
    }

    // Filter by type
    const type = req.body?.type || req.query?.type
    if (type) {
      where.type = String(type)
    }

    const [count] = await Notification.update(
      {
        read: true,
        read_at: new Date(),
      },
      {
        where,
      },
    )

    return res.json({ success: true, count })
  } catch (err) {
    console.error('❌ Failed to mark all notifications read', err)
    return res
      .status(500)
      .json({ success: false, message: err.message || 'Failed to mark all notifications read' })
  }
}

