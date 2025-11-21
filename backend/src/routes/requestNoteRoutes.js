import express from 'express'
import { authenticate } from '../middleware/authMiddleware.js'
import { requireNoteAddAccess } from '../middleware/requestAccess.js'
import {
  createNote,
  listNotes,
  updateNote,
  deleteNote,
} from '../controllers/requestNoteController.js'

const router = express.Router({ mergeParams: true })

router.use(authenticate)

router.post('/', requireNoteAddAccess, createNote)
router.get('/', listNotes)
router.patch('/:noteId', updateNote)
router.delete('/:noteId', deleteNote)

export default router

