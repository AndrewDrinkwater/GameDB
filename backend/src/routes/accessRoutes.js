import express from 'express'
import { authenticate } from '../middleware/authMiddleware.js'
import {
  applyBulkAccessUpdate,
  getBulkAccessRun,
  listBulkAccessRuns,
  revertBulkAccessRun,
} from '../controllers/bulkAccessController.js'

const router = express.Router()

router.use(authenticate)

router.post('/bulk/apply', applyBulkAccessUpdate)
router.get('/bulk/runs', listBulkAccessRuns)
router.get('/bulk/runs/:id', getBulkAccessRun)
router.post('/bulk/runs/:id/revert', revertBulkAccessRun)

export default router
