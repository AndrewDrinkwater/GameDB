import express from 'express'
import { User } from '../models/index.js'
import { authenticate } from '../middleware/authMiddleware.js'

const router = express.Router()

// Apply auth middleware to all user routes
router.use(authenticate)

// === GET all users ===
router.get('/', async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'username', 'email', 'role', 'createdAt', 'updatedAt'],
      order: [['createdAt', 'DESC']],
    })
    res.json({ success: true, data: users })
  } catch (err) {
    console.error('❌ Failed to fetch users:', err)
    res.status(500).json({ success: false, message: err.message })
  }
})

// === GET single user ===
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: ['id', 'username', 'email', 'role', 'createdAt', 'updatedAt'],
    })
    if (!user) return res.status(404).json({ success: false, message: 'User not found' })
    res.json({ success: true, data: user })
  } catch (err) {
    console.error('❌ Failed to fetch user:', err)
    res.status(500).json({ success: false, message: err.message })
  }
})

// === CREATE user ===
router.post('/', async (req, res) => {
  try {
    const { username, email, password, role } = req.body
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'Missing required fields' })
    }

    const newUser = await User.create({ username, email, password, role: role || 'user' })
    res.json({ success: true, data: newUser })
  } catch (err) {
    console.error('❌ Failed to create user:', err)
    res.status(500).json({ success: false, message: err.message })
  }
})

// === UPDATE user ===
router.put('/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id)
    if (!user) return res.status(404).json({ success: false, message: 'User not found' })

    await user.update(req.body)
    res.json({ success: true, data: user })
  } catch (err) {
    console.error('❌ Failed to update user:', err)
    res.status(500).json({ success: false, message: err.message })
  }
})

// === DELETE user ===
router.delete('/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id)
    if (!user) return res.status(404).json({ success: false, message: 'User not found' })

    await user.destroy()
    res.json({ success: true, message: 'User deleted' })
  } catch (err) {
    console.error('❌ Failed to delete user:', err)
    res.status(500).json({ success: false, message: err.message })
  }
})

export default router
