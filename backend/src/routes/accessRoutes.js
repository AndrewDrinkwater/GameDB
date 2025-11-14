import express from 'express'
import { authenticate } from '../middleware/authMiddleware.js'
import { parseCampaignContext, requireCampaignDM } from '../middleware/campaignContext.js'
import {
  applyBulkAccessUpdate,
  getBulkAccessRun,
  listBulkAccessRuns,
  revertBulkAccessRun,
} from '../controllers/bulkAccessController.js'

const router = express.Router()

router.use(authenticate)
router.use(parseCampaignContext)

router.post('/bulk/apply', requireCampaignDM, applyBulkAccessUpdate)
router.get('/bulk/runs', listBulkAccessRuns)
router.get('/bulk/runs/:id', getBulkAccessRun)
router.post('/bulk/runs/:id/revert', revertBulkAccessRun)

export default router
