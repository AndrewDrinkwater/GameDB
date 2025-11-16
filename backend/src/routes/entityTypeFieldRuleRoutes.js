import { Router } from 'express'
import { authenticate } from '../middleware/authMiddleware.js'
import {
  deleteEntityTypeFieldRule,
  updateEntityTypeFieldRule,
} from '../controllers/entityFieldRuleController.js'

const router = Router()

router.use(authenticate)

router.patch('/:id', updateEntityTypeFieldRule)
router.delete('/:id', deleteEntityTypeFieldRule)

export default router
