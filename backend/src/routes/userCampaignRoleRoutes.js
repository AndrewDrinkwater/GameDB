import express from 'express'
import { UserCampaignRole } from '../models/index.js'
import { authenticate as authMiddleware } from '../middleware/authMiddleware.js'



const router = express.Router()

router.get('/', authMiddleware, async (req, res) => {
  try {
    const where = {}
    if (req.query.user_id) where.user_id = req.query.user_id
    if (req.query.campaign_id) where.campaign_id = req.query.campaign_id
    const data = await UserCampaignRole.findAll({ where })
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

router.post('/', authMiddleware, async (req, res) => {
  try {
    const data = await UserCampaignRole.create(req.body)
    res.status(201).json({ success: true, data })
  } catch (err) {
    res.status(400).json({ success: false, message: err.message })
  }
})

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const [updated] = await UserCampaignRole.update(req.body, { where: { id: req.params.id } })
    res.json({ success: true, updated })
  } catch (err) {
    res.status(400).json({ success: false, message: err.message })
  }
})

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await UserCampaignRole.destroy({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (err) {
    res.status(400).json({ success: false, message: err.message })
  }
})

export default router
