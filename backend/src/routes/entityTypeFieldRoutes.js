import { Router } from 'express'
import { authenticate } from '../middleware/authMiddleware.js'
import {
  deleteEntityTypeField,
  updateEntityTypeField,
} from '../controllers/entityTypeFieldController.js'

const router = Router()

router.use(authenticate)

router.patch('/:id', updateEntityTypeField)
router.delete('/:id', deleteEntityTypeField)

export default router
