import express from 'express'
import { EntityRelationship } from '../models/index.js'
import { authenticate as authMiddleware } from '../middleware/authMiddleware.js'


const router = express.Router()

router.get('/', authMiddleware, async (req, res) => {
  try {
    const where = {}
    if (req.query.from_entity) where.from_entity = req.query.from_entity
    if (req.query.to_entity) where.to_entity = req.query.to_entity
    const data = await EntityRelationship.findAll({ where })
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

router.post('/', authMiddleware, async (req, res) => {
  try {
    const data = await EntityRelationship.create(req.body)
    res.status(201).json({ success: true, data })
  } catch (err) {
    res.status(400).json({ success: false, message: err.message })
  }
})

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const [updated] = await EntityRelationship.update(req.body, { where: { id: req.params.id } })
    res.json({ success: true, updated })
  } catch (err) {
    res.status(400).json({ success: false, message: err.message })
  }
})

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await EntityRelationship.destroy({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (err) {
    res.status(400).json({ success: false, message: err.message })
  }
})

export default router
