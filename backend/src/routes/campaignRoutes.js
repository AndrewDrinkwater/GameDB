import express from 'express'
import { Campaign } from '../models/index.js'
import { authenticate as authMiddleware } from '../middleware/authMiddleware.js'


const router = express.Router()

// ✅ Get all campaigns (optionally filter by world)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const where = {}
    if (req.query.world_id) where.world_id = req.query.world_id
    const campaigns = await Campaign.findAll({ where, order: [['createdAt', 'DESC']] })
    res.json({ success: true, data: campaigns })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// ✅ Get single campaign
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const campaign = await Campaign.findByPk(req.params.id)
    if (!campaign) return res.status(404).json({ success: false, message: 'Not found' })
    res.json({ success: true, data: campaign })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// ✅ Create campaign
router.post('/', authMiddleware, async (req, res) => {
  try {
    const campaign = await Campaign.create(req.body)
    res.status(201).json({ success: true, data: campaign })
  } catch (err) {
    res.status(400).json({ success: false, message: err.message })
  }
})

// ✅ Update campaign
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const [count] = await Campaign.update(req.body, { where: { id: req.params.id } })
    res.json({ success: true, updated: count })
  } catch (err) {
    res.status(400).json({ success: false, message: err.message })
  }
})

// ✅ Delete campaign
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await Campaign.destroy({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (err) {
    res.status(400).json({ success: false, message: err.message })
  }
})

export default router
