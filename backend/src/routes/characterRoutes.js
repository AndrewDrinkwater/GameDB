import express from 'express'
import { Character, Campaign, User } from '../models/index.js'
import { authenticate as authMiddleware } from '../middleware/authMiddleware.js'

const router = express.Router()

// ✅ Get all characters (optional filters)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const where = {}
    if (req.query.campaign_id) where.campaign_id = req.query.campaign_id
    if (req.query.user_id) where.user_id = req.query.user_id

    const characters = await Character.findAll({
      where,
      include: [
        { model: User, as: 'player', attributes: ['id', 'username', 'email'] },
        { model: Campaign, as: 'campaign', attributes: ['id', 'name'] },
      ],
      order: [['createdAt', 'DESC']],
    })

    res.json({ success: true, data: characters })
  } catch (err) {
    console.error('❌ Failed to fetch characters:', err)
    res.status(500).json({ success: false, message: err.message })
  }
})

// ✅ Get a single character
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const character = await Character.findByPk(req.params.id, {
      include: [
        { model: User, as: 'player', attributes: ['id', 'username', 'email'] },
        { model: Campaign, as: 'campaign', attributes: ['id', 'name'] },
      ],
    })

    if (!character) {
      return res.status(404).json({ success: false, message: 'Character not found' })
    }

    res.json({ success: true, data: character })
  } catch (err) {
    console.error('❌ Failed to fetch character:', err)
    res.status(500).json({ success: false, message: err.message })
  }
})

// ✅ Create a new character
router.post('/', authMiddleware, async (req, res) => {
  try {
    const character = await Character.create(req.body)
    res.status(201).json({ success: true, data: character })
  } catch (err) {
    console.error('❌ Failed to create character:', err)
    res.status(400).json({ success: false, message: err.message })
  }
})

// ✅ Update an existing character
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const [updated] = await Character.update(req.body, { where: { id: req.params.id } })
    res.json({ success: true, updated })
  } catch (err) {
    console.error('❌ Failed to update character:', err)
    res.status(400).json({ success: false, message: err.message })
  }
})

// ✅ Delete a character
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await Character.destroy({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (err) {
    console.error('❌ Failed to delete character:', err)
    res.status(400).json({ success: false, message: err.message })
  }
})

export default router
