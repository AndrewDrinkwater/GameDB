import { Router } from 'express'
import { authenticate } from '../middleware/authMiddleware.js'
import {
  deleteLocationTypeField,
  updateLocationTypeField,
} from '../controllers/locationTypeFieldController.js'

const router = Router()

router.use(authenticate)

router.patch('/:id', updateLocationTypeField)
router.delete('/:id', deleteLocationTypeField)

export default router

