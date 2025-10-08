import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { User } from '../models/user.js'
import dotenv from 'dotenv'

dotenv.config()

const JWT_SECRET = process.env.JWT_SECRET || 'devsecret'

export const register = async (req, res) => {
  try {
    const { username, password, role } = req.body

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password required' })
    }

    const existing = await User.findOne({ where: { username } })
    if (existing) {
      return res.status(409).json({ success: false, message: 'Username already exists' })
    }

    const password_hash = await bcrypt.hash(password, 10)
    const user = await User.create({ username, password_hash, role })
    res.status(201).json({ success: true, message: 'User registered', user: { id: user.id, username: user.username, role: user.role } })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const login = async (req, res) => {
  try {
    const { username, password } = req.body

    const user = await User.findOne({ where: { username } })
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' })
    }

    const valid = await user.validatePassword(password)
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' })
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    )

    res.json({ success: true, token, user: { id: user.id, username: user.username, role: user.role } })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}
