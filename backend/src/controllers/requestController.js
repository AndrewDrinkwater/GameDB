import { Request, User } from '../models/index.js'
import { Op } from 'sequelize'
import { canViewRequest, canEditRequest } from '../middleware/requestAccess.js'
import {
  notifyRequestStatusChange,
  notifyRequestAssigned,
} from '../utils/notificationService.js'

const normaliseId = (value) => {
  if (!value) return null
  const str = String(value).trim()
  return str || null
}

const isSystemAdmin = (user) => user?.role === 'system_admin'

/**
 * Create a new request
 * Any authenticated user can create
 */
export const createRequest = async (req, res) => {
  try {
    const userId = normaliseId(req.user?.id)
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' })
    }

    const { type, title, description, priority } = req.body

    if (!type || !['bug', 'feature'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Type must be "bug" or "feature"' })
    }

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Title is required' })
    }

    if (!description || !description.trim()) {
      return res.status(400).json({ success: false, message: 'Description is required' })
    }

    const request = await Request.create({
      type,
      title: title.trim(),
      description: description.trim(),
      created_by: userId,
      status: 'open',
      priority: priority && ['low', 'medium', 'high'].includes(priority) ? priority : null,
      is_in_backlog: false,
    })

    const payload = await Request.findByPk(request.id, {
      include: [
        { model: User, as: 'creator', attributes: ['id', 'username', 'email'] },
        { model: User, as: 'assignee', attributes: ['id', 'username', 'email'], required: false },
        { model: User, as: 'tester', attributes: ['id', 'username', 'email'], required: false },
      ],
    })

    const plain = typeof payload.get === 'function' ? payload.get({ plain: true }) : payload

    return res.status(201).json({
      success: true,
      data: {
        id: plain.id,
        type: plain.type,
        title: plain.title,
        description: plain.description,
        status: plain.status,
        priority: plain.priority,
        isInBacklog: plain.is_in_backlog,
        createdBy: plain.created_by,
        assignedTo: plain.assigned_to,
        creator: plain.creator
          ? {
              id: plain.creator.id,
              username: plain.creator.username,
              email: plain.creator.email,
            }
          : null,
        assignee: plain.assignee
          ? {
              id: plain.assignee.id,
              username: plain.assignee.username,
              email: plain.assignee.email,
            }
          : null,
        testerId: plain.tester_id,
        tester: plain.tester
          ? {
              id: plain.tester.id,
              username: plain.tester.username,
              email: plain.tester.email,
            }
          : null,
        createdAt: plain.created_at,
        updatedAt: plain.updated_at,
      },
    })
  } catch (err) {
    console.error('❌ Failed to create request', err)
    return res.status(500).json({ success: false, message: err.message || 'Failed to create request' })
  }
}

/**
 * List requests
 * Users see their own, admins see all
 */
export const listRequests = async (req, res) => {
  try {
    const userId = normaliseId(req.user?.id)
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' })
    }

    const isAdmin = isSystemAdmin(req.user)
    const page = Math.max(1, parseInt(req.query?.page || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(req.query?.limit || '20', 10)))
    const offset = (page - 1) * limit

    const where = {}

    // Non-admins only see their own requests or requests assigned to them as tester
    if (!isAdmin) {
      where[Op.or] = [
        { created_by: userId },
        { tester_id: userId }
      ]
    }

    // Filters
    const type = req.query?.type
    if (type && ['bug', 'feature'].includes(type)) {
      where.type = type
    }

    const status = req.query?.status
    if (status && ['open', 'in_progress', 'testing', 'resolved', 'closed', 'backlog'].includes(status)) {
      where.status = status
    }

    const isInBacklog = req.query?.isInBacklog || req.query?.is_in_backlog
    if (isInBacklog !== undefined) {
      where.is_in_backlog = String(isInBacklog).toLowerCase() === 'true'
    }

    const assignedTo = normaliseId(req.query?.assignedTo || req.query?.assigned_to)
    if (assignedTo) {
      where.assigned_to = assignedTo
    }

    const { count, rows } = await Request.findAndCountAll({
      where,
      include: [
        { model: User, as: 'creator', attributes: ['id', 'username', 'email'] },
        { model: User, as: 'assignee', attributes: ['id', 'username', 'email'], required: false },
        { model: User, as: 'tester', attributes: ['id', 'username', 'email'], required: false },
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset,
    })

    const formatted = rows.map((request) => {
      const plain = typeof request.get === 'function' ? request.get({ plain: true }) : request
      return {
        id: plain.id,
        type: plain.type,
        title: plain.title,
        description: plain.description,
        status: plain.status,
        priority: plain.priority,
        isInBacklog: plain.is_in_backlog,
        createdBy: plain.created_by,
        assignedTo: plain.assigned_to,
        creator: plain.creator
          ? {
              id: plain.creator.id,
              username: plain.creator.username,
              email: plain.creator.email,
            }
          : null,
        assignee: plain.assignee
          ? {
              id: plain.assignee.id,
              username: plain.assignee.username,
              email: plain.assignee.email,
            }
          : null,
        testerId: plain.tester_id,
        tester: plain.tester
          ? {
              id: plain.tester.id,
              username: plain.tester.username,
              email: plain.tester.email,
            }
          : null,
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
    console.error('❌ Failed to list requests', err)
    return res.status(500).json({ success: false, message: err.message || 'Failed to load requests' })
  }
}

/**
 * Get single request
 * Users see their own, admins see all
 */
export const getRequest = async (req, res) => {
  try {
    const userId = normaliseId(req.user?.id)
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' })
    }

    const requestId = normaliseId(req.params?.id)
    if (!requestId) {
      return res.status(400).json({ success: false, message: 'Request ID is required' })
    }

    const canView = await canViewRequest(requestId, userId, req.user?.role)
    if (!canView) {
      return res.status(403).json({ success: false, message: 'Access denied' })
    }

    const request = await Request.findByPk(requestId, {
      include: [
        { model: User, as: 'creator', attributes: ['id', 'username', 'email'] },
        { model: User, as: 'assignee', attributes: ['id', 'username', 'email'], required: false },
        { model: User, as: 'tester', attributes: ['id', 'username', 'email'], required: false },
      ],
    })

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' })
    }

    const plain = typeof request.get === 'function' ? request.get({ plain: true }) : request

    return res.json({
      success: true,
      data: {
        id: plain.id,
        type: plain.type,
        title: plain.title,
        description: plain.description,
        status: plain.status,
        priority: plain.priority,
        isInBacklog: plain.is_in_backlog,
        createdBy: plain.created_by,
        assignedTo: plain.assigned_to,
        creator: plain.creator
          ? {
              id: plain.creator.id,
              username: plain.creator.username,
              email: plain.creator.email,
            }
          : null,
        assignee: plain.assignee
          ? {
              id: plain.assignee.id,
              username: plain.assignee.username,
              email: plain.assignee.email,
            }
          : null,
        testerId: plain.tester_id,
        tester: plain.tester
          ? {
              id: plain.tester.id,
              username: plain.tester.username,
              email: plain.tester.email,
            }
          : null,
        createdAt: plain.created_at,
        updatedAt: plain.updated_at,
      },
    })
  } catch (err) {
    console.error('❌ Failed to get request', err)
    return res.status(500).json({ success: false, message: err.message || 'Failed to load request' })
  }
}

/**
 * Update request
 * Only admins can update
 */
export const updateRequest = async (req, res) => {
  try {
    const userId = normaliseId(req.user?.id)
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' })
    }

    if (!canEditRequest(req.user)) {
      return res.status(403).json({ success: false, message: 'Admin access required' })
    }

    const requestId = normaliseId(req.params?.id)
    if (!requestId) {
      return res.status(400).json({ success: false, message: 'Request ID is required' })
    }

    const request = await Request.findByPk(requestId)
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' })
    }

    const { status, assigned_to, assignedTo, tester_id, testerId, priority, is_in_backlog, isInBacklog } = req.body

    const oldStatus = request.status
    const oldAssignedTo = request.assigned_to

    const updateData = {}

    if (status && ['open', 'in_progress', 'testing', 'resolved', 'closed', 'backlog'].includes(status)) {
      updateData.status = status
    }

    const assignedToValue = normaliseId(assigned_to || assignedTo)
    if (assignedToValue !== undefined) {
      updateData.assigned_to = assignedToValue
    }

    const testerIdValue = normaliseId(tester_id || testerId)
    if (testerIdValue !== undefined) {
      updateData.tester_id = testerIdValue
    }

    if (priority !== undefined) {
      if (priority === null || ['low', 'medium', 'high'].includes(priority)) {
        updateData.priority = priority
      }
    }

    const backlogValue = is_in_backlog !== undefined ? is_in_backlog : isInBacklog
    if (backlogValue !== undefined) {
      updateData.is_in_backlog = Boolean(backlogValue)
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields to update' })
    }

    await request.update(updateData)

    // Trigger notifications asynchronously
    ;(async () => {
      try {
        if (updateData.status && updateData.status !== oldStatus) {
          await notifyRequestStatusChange(request, oldStatus)
        }
        if (updateData.assigned_to !== undefined && updateData.assigned_to !== oldAssignedTo) {
          await notifyRequestAssigned(request, oldAssignedTo)
        }
      } catch (err) {
        console.error('❌ Failed to send notifications', err)
      }
    })()

    const updated = await Request.findByPk(request.id, {
      include: [
        { model: User, as: 'creator', attributes: ['id', 'username', 'email'] },
        { model: User, as: 'assignee', attributes: ['id', 'username', 'email'], required: false },
        { model: User, as: 'tester', attributes: ['id', 'username', 'email'], required: false },
      ],
    })

    const plain = typeof updated.get === 'function' ? updated.get({ plain: true }) : updated

    return res.json({
      success: true,
      data: {
        id: plain.id,
        type: plain.type,
        title: plain.title,
        description: plain.description,
        status: plain.status,
        priority: plain.priority,
        isInBacklog: plain.is_in_backlog,
        createdBy: plain.created_by,
        assignedTo: plain.assigned_to,
        creator: plain.creator
          ? {
              id: plain.creator.id,
              username: plain.creator.username,
              email: plain.creator.email,
            }
          : null,
        assignee: plain.assignee
          ? {
              id: plain.assignee.id,
              username: plain.assignee.username,
              email: plain.assignee.email,
            }
          : null,
        testerId: plain.tester_id,
        tester: plain.tester
          ? {
              id: plain.tester.id,
              username: plain.tester.username,
              email: plain.tester.email,
            }
          : null,
        createdAt: plain.created_at,
        updatedAt: plain.updated_at,
      },
    })
  } catch (err) {
    console.error('❌ Failed to update request', err)
    return res.status(500).json({ success: false, message: err.message || 'Failed to update request' })
  }
}

/**
 * Delete request
 * Only admins can delete
 */
export const deleteRequest = async (req, res) => {
  try {
    const userId = normaliseId(req.user?.id)
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' })
    }

    if (!canEditRequest(req.user)) {
      return res.status(403).json({ success: false, message: 'Admin access required' })
    }

    const requestId = normaliseId(req.params?.id)
    if (!requestId) {
      return res.status(400).json({ success: false, message: 'Request ID is required' })
    }

    const request = await Request.findByPk(requestId)
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' })
    }

    await request.destroy()

    return res.json({ success: true, message: 'Request deleted successfully' })
  } catch (err) {
    console.error('❌ Failed to delete request', err)
    return res.status(500).json({ success: false, message: err.message || 'Failed to delete request' })
  }
}

