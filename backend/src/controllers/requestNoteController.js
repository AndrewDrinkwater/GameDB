import { RequestNote, Request, User } from '../models/index.js'
import { canAddNote, canViewRequest } from '../middleware/requestAccess.js'
import { notifyRequestNoteAdded } from '../utils/notificationService.js'

const normaliseId = (value) => {
  if (!value) return null
  const str = String(value).trim()
  return str || null
}

const isSystemAdmin = (user) => user?.role === 'system_admin'

/**
 * Create a note on a request
 * Request creator and admins can add notes
 */
export const createNote = async (req, res) => {
  try {
    const userId = normaliseId(req.user?.id)
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' })
    }

    const requestId = normaliseId(req.params?.requestId || req.body?.request_id)
    if (!requestId) {
      return res.status(400).json({ success: false, message: 'Request ID is required' })
    }

    const canAdd = await canAddNote(requestId, userId, req.user?.role)
    if (!canAdd) {
      return res.status(403).json({ success: false, message: 'Access denied' })
    }

    const { content } = req.body

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Note content is required' })
    }

    const note = await RequestNote.create({
      request_id: requestId,
      content: content.trim(),
      created_by: userId,
    })

    const payload = await RequestNote.findByPk(note.id, {
      include: [
        { model: Request, as: 'request', attributes: ['id', 'title', 'created_by'] },
        { model: User, as: 'author', attributes: ['id', 'username', 'email'] },
      ],
    })

    // Trigger notification asynchronously
    ;(async () => {
      try {
        await notifyRequestNoteAdded(payload, requestId)
      } catch (err) {
        console.error('❌ Failed to send notification', err)
      }
    })()

    const plain = typeof payload.get === 'function' ? payload.get({ plain: true }) : payload

    return res.status(201).json({
      success: true,
      data: {
        id: plain.id,
        requestId: plain.request_id,
        content: plain.content,
        createdBy: plain.created_by,
        author: plain.author
          ? {
              id: plain.author.id,
              username: plain.author.username,
              email: plain.author.email,
            }
          : null,
        createdAt: plain.created_at,
        updatedAt: plain.updated_at,
      },
    })
  } catch (err) {
    console.error('❌ Failed to create note', err)
    return res.status(500).json({ success: false, message: err.message || 'Failed to create note' })
  }
}

/**
 * List notes for a request
 * Request creator and admins can view
 */
export const listNotes = async (req, res) => {
  try {
    const userId = normaliseId(req.user?.id)
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' })
    }

    const requestId = normaliseId(req.params?.requestId)
    if (!requestId) {
      return res.status(400).json({ success: false, message: 'Request ID is required' })
    }

    // Check if user can view the request (which implies they can view notes)
    const canView = await canViewRequest(requestId, userId, req.user?.role)
    if (!canView) {
      return res.status(403).json({ success: false, message: 'Access denied' })
    }

    const notes = await RequestNote.findAll({
      where: { request_id: requestId },
      include: [{ model: User, as: 'author', attributes: ['id', 'username', 'email'] }],
      order: [['created_at', 'ASC']],
    })

    const formatted = notes.map((note) => {
      const plain = typeof note.get === 'function' ? note.get({ plain: true }) : note
      return {
        id: plain.id,
        requestId: plain.request_id,
        content: plain.content,
        createdBy: plain.created_by,
        author: plain.author
          ? {
              id: plain.author.id,
              username: plain.author.username,
              email: plain.author.email,
            }
          : null,
        createdAt: plain.created_at,
        updatedAt: plain.updated_at,
      }
    })

    return res.json({
      success: true,
      data: formatted,
    })
  } catch (err) {
    console.error('❌ Failed to list notes', err)
    return res.status(500).json({ success: false, message: err.message || 'Failed to load notes' })
  }
}

/**
 * Update a note
 * Only note creator can update
 */
export const updateNote = async (req, res) => {
  try {
    const userId = normaliseId(req.user?.id)
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' })
    }

    const noteId = normaliseId(req.params?.noteId)
    if (!noteId) {
      return res.status(400).json({ success: false, message: 'Note ID is required' })
    }

    const note = await RequestNote.findByPk(noteId)
    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found' })
    }

    // Only note creator can update
    if (String(note.created_by) !== String(userId)) {
      return res.status(403).json({ success: false, message: 'Access denied' })
    }

    const { content } = req.body

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Note content is required' })
    }

    await note.update({ content: content.trim() })

    const updated = await RequestNote.findByPk(note.id, {
      include: [{ model: User, as: 'author', attributes: ['id', 'username', 'email'] }],
    })

    const plain = typeof updated.get === 'function' ? updated.get({ plain: true }) : updated

    return res.json({
      success: true,
      data: {
        id: plain.id,
        requestId: plain.request_id,
        content: plain.content,
        createdBy: plain.created_by,
        author: plain.author
          ? {
              id: plain.author.id,
              username: plain.author.username,
              email: plain.author.email,
            }
          : null,
        createdAt: plain.created_at,
        updatedAt: plain.updated_at,
      },
    })
  } catch (err) {
    console.error('❌ Failed to update note', err)
    return res.status(500).json({ success: false, message: err.message || 'Failed to update note' })
  }
}

/**
 * Delete a note
 * Note creator and admins can delete
 */
export const deleteNote = async (req, res) => {
  try {
    const userId = normaliseId(req.user?.id)
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' })
    }

    const noteId = normaliseId(req.params?.noteId)
    if (!noteId) {
      return res.status(400).json({ success: false, message: 'Note ID is required' })
    }

    const note = await RequestNote.findByPk(noteId)
    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found' })
    }

    // Note creator or admin can delete
    const isAdmin = isSystemAdmin(req.user)
    if (String(note.created_by) !== String(userId) && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied' })
    }

    await note.destroy()

    return res.json({ success: true, message: 'Note deleted successfully' })
  } catch (err) {
    console.error('❌ Failed to delete note', err)
    return res.status(500).json({ success: false, message: err.message || 'Failed to delete note' })
  }
}

