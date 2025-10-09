import express from 'express'
import { Entity } from '../models/index.js'
import { authenticate as authMiddleware } from '../middleware/authMiddleware.js'


const router = express.Router()

router.get('/', authMiddleware, async (req, res) => {
  try {
    const where = {}
    if (req.query.world_id) where.world_id = req.query.world_id
    const data = await Entity.findAll({ where, order: [['createdAt', 'DESC']] })
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const data = await Entity.findByPk(req.params.id)
    if (!data) return res.status(404).json({ success: false, message: 'Not found' })
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

router.post('/', authMiddleware, async (req, res) => {
  try {
    const data = await Entity.create(req.body)
    res.status(201).json({ success: true, data })
  } catch (err) {
    res.status(400).json({ success: false, message: err.message })
  }
})

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const [updated] = await Entity.update(req.body, { where: { id: req.params.id } })
    res.json({ success: true, updated })
  } catch (err) {
    res.status(400).json({ success: false, message: err.message })
  }
})

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await Entity.destroy({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (err) {
    res.status(400).json({ success: false, message: err.message })
  }
})

export default router
