// src/middleware/authMiddleware.js
import jwt from 'jsonwebtoken'
import { cfg } from '../config/env.js'

export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Missing or invalid token' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = jwt.verify(token, cfg.jwtSecret)
    req.user = decoded
    next()
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' })
  }
}

// Restrict routes to specific roles
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }
    next()
  }
}
