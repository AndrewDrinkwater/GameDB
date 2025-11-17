import { Router } from 'express'
import { authenticate } from '../middleware/authMiddleware.js'
import {
  createEntityType,
  deleteEntityType,
  getEntityType,
  listEntityTypes,
  updateEntityType,
} from '../controllers/entityTypeController.js'
import {
  createEntityTypeField,
  listEntityTypeFields,
} from '../controllers/entityTypeFieldController.js'
import {
  listEntityTypeFieldLayout,
  updateEntityTypeFieldLayout,
} from '../controllers/entityFieldLayoutController.js'
import {
  listEntityTypeFieldRules,
  createEntityTypeFieldRule,
} from '../controllers/entityFieldRuleController.js'
import {
  getEntityTypeListColumns,
  updateEntityTypeListColumns,
} from '../controllers/entityListPreferenceController.js'

const router = Router()

router.use(authenticate)

router.get('/', listEntityTypes)
router.post('/', createEntityType)
router.get('/:id/fields', listEntityTypeFields)
router.post('/:id/fields', createEntityTypeField)
router.get('/:id/field-order', listEntityTypeFieldLayout)
router.put('/:id/field-order', updateEntityTypeFieldLayout)
router.get('/:id/field-rules', listEntityTypeFieldRules)
router.post('/:id/field-rules', createEntityTypeFieldRule)
router.get('/:id/list-columns', getEntityTypeListColumns)
router.patch('/:id/list-columns', updateEntityTypeListColumns)
router.get('/:id', getEntityType)
router.patch('/:id', updateEntityType)
router.delete('/:id', deleteEntityType)

export default router
