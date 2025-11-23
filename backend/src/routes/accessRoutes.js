import express from 'express'
import { authenticate } from '../middleware/authMiddleware.js'
import { parseCampaignContext, requireCampaignDM } from '../middleware/campaignContext.js'
import {
  applyBulkAccessUpdate,
  getBulkAccessRun,
  listBulkAccessRuns,
  revertBulkAccessRun,
} from '../controllers/bulkAccessController.js'
import {
  createCollection,
  deleteCollection,
  getCollectionEntities,
  listCollections,
  updateCollection,
} from '../controllers/entityCollectionController.js'
import {
  createCollection as createLocationCollection,
  deleteCollection as deleteLocationCollection,
  getCollectionLocations,
  listCollections as listLocationCollections,
  updateCollection as updateLocationCollection,
} from '../controllers/locationCollectionController.js'

const router = express.Router()

router.use(authenticate)
router.use(parseCampaignContext)

router.post('/bulk/apply', requireCampaignDM, applyBulkAccessUpdate)
router.get('/bulk/runs', listBulkAccessRuns)
router.get('/bulk/runs/:id', getBulkAccessRun)
router.post('/bulk/runs/:id/revert', revertBulkAccessRun)

router.get('/collections', listCollections)
router.post('/collections', createCollection)
router.put('/collections/:id', updateCollection)
router.delete('/collections/:id', deleteCollection)
router.get('/collections/:id/entities', getCollectionEntities)

router.get('/location-collections', listLocationCollections)
router.post('/location-collections', createLocationCollection)
router.put('/location-collections/:id', updateLocationCollection)
router.delete('/location-collections/:id', deleteLocationCollection)
router.get('/location-collections/:id/locations', getCollectionLocations)

export default router
