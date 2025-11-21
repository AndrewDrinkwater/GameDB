import { Request } from '../models/index.js'

const isSystemAdmin = (user) => user?.role === 'system_admin'

const normaliseId = (value) => {
  if (!value) return null
  const str = String(value).trim()
  return str || null
}

/**
 * Check if user can view a request
 * - Admins can view all requests
 * - Users can view their own requests
 */
export const canViewRequest = async (requestId, userId) => {
  if (!requestId || !userId) return false

  try {
    const request = await Request.findByPk(requestId, {
      attributes: ['id', 'created_by'],
    })

    if (!request) return false

    const user = { id: userId, role: null } // We'll get role from req.user in controllers
    if (isSystemAdmin(user)) return true

    return String(request.created_by) === String(userId)
  } catch (err) {
    console.error('❌ Failed to check request view access', err)
    return false
  }
}

/**
 * Check if user can edit a request (admin only)
 */
export const canEditRequest = (user) => {
  return isSystemAdmin(user)
}

/**
 * Check if user can add a note to a request
 * - Request creator can add notes
 * - Admins can add notes
 */
export const canAddNote = async (requestId, userId) => {
  if (!requestId || !userId) return false

  try {
    const request = await Request.findByPk(requestId, {
      attributes: ['id', 'created_by'],
    })

    if (!request) return false

    const user = { id: userId, role: null } // We'll get role from req.user in controllers
    if (isSystemAdmin(user)) return true

    return String(request.created_by) === String(userId)
  } catch (err) {
    console.error('❌ Failed to check note add access', err)
    return false
  }
}

/**
 * Middleware to check if user can view request
 */
export const requireRequestViewAccess = async (req, res, next) => {
  try {
    const userId = normaliseId(req.user?.id)
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' })
    }

    const requestId = normaliseId(req.params?.id || req.params?.requestId)
    if (!requestId) {
      return res.status(400).json({ success: false, message: 'Request ID is required' })
    }

    const canView = await canViewRequest(requestId, userId)
    if (!canView) {
      return res.status(403).json({ success: false, message: 'Access denied' })
    }

    next()
  } catch (err) {
    console.error('❌ Request view access check failed', err)
    return res.status(500).json({ success: false, message: 'Failed to check access' })
  }
}

/**
 * Middleware to check if user can edit request (admin only)
 */
export const requireRequestEditAccess = (req, res, next) => {
  if (!canEditRequest(req.user)) {
    return res.status(403).json({ success: false, message: 'Admin access required' })
  }
  next()
}

/**
 * Middleware to check if user can add note
 */
export const requireNoteAddAccess = async (req, res, next) => {
  try {
    const userId = normaliseId(req.user?.id)
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' })
    }

    const requestId = normaliseId(req.params?.requestId || req.body?.request_id)
    if (!requestId) {
      return res.status(400).json({ success: false, message: 'Request ID is required' })
    }

    const canAdd = await canAddNote(requestId, userId)
    if (!canAdd) {
      return res.status(403).json({ success: false, message: 'Access denied' })
    }

    next()
  } catch (err) {
    console.error('❌ Note add access check failed', err)
    return res.status(500).json({ success: false, message: 'Failed to check access' })
  }
}

