import { Router } from 'express'
import { authenticate } from '../middleware/authMiddleware.js'
import { listEntityTypes } from '../controllers/entityTypeController.js'
import {
  createEntityTypeField,
  listEntityTypeFields,
} from '../controllers/entityTypeFieldController.js'

const router = Router()

router.use(authenticate)

router.get('/', listEntityTypes)
router.get('/:id/fields', listEntityTypeFields)
router.post('/:id/fields', createEntityTypeField)

export default router
