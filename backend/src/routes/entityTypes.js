import { Router } from 'express'
import { authenticate } from '../middleware/authMiddleware.js'
import {
  createEntityType,
  deleteEntityType,
  listEntityTypes,
  updateEntityType,
} from '../controllers/entityTypeController.js'
import {
  createEntityTypeField,
  listEntityTypeFields,
} from '../controllers/entityTypeFieldController.js'

const router = Router()

router.use(authenticate)

router.get('/', listEntityTypes)
router.post('/', createEntityType)
router.patch('/:id', updateEntityType)
router.delete('/:id', deleteEntityType)
router.get('/:id/fields', listEntityTypeFields)
router.post('/:id/fields', createEntityTypeField)

export default router
