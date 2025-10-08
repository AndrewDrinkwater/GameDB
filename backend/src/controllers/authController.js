// src/controllers/authController.js
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
import { User } from '../models/index.js'

dotenv.config()

const JWT_SECRET = process.env.JWT_SECRET || 'devsecret'
const JWT_EXPIRY = '8h'

// Register a new user
export const register = async (req, res) => {
  try {
    const { username, password, role } = req.body

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' })
    }

    const existing = await User.findOne({ where: { username } })
    if (existing) {
      return res.status(400).json({ success: false, message: 'Username already exists' })
    }

    const password_hash = await bcrypt.hash(password, 10)
    const user = await User.create({
      username,
      password_hash,
      role: role || 'player',
    })

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: { id: user.id, username: user.username, role: user.role },
    })
  } catch (err) {
    console.error('❌ Register error:', err)
    res.status(500).json({ success: false, message: 'Server error during registration' })
  }
}

// Login
export const login = async (req, res) => {
  try {
    const { username, password } = req.body
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Missing username or password' })
    }

    const user = await User.findOne({ where: { username } })
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' })
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' })
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    )

    res.json({
      success: true,
      token,
      user: { id: user.id, username: user.username, role: user.role },
    })
  } catch (err) {
    console.error('❌ Login error:', err)
    res.status(500).json({ success: false, message: 'Server error during login' })
  }
}
