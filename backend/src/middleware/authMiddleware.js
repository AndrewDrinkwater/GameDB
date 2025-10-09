// src/middleware/authMiddleware.js
import jwt from 'jsonwebtoken'
import { cfg } from '../config/env.js'

// 🔍 Auth middleware with detailed debug logging
export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization
  console.log('🔐 Incoming auth header:', authHeader)

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('❌ Missing or malformed Authorization header')
    return res.status(401).json({ success: false, message: 'Missing or invalid token' })
  }

  const token = authHeader.split(' ')[1]

  try {
    console.log('🧩 Using JWT secret:', cfg.jwtSecret)
    const decoded = jwt.verify(token, cfg.jwtSecret)
    console.log('✅ Token verified successfully. Payload:', decoded)
    req.user = decoded
    next()
  } catch (err) {
    console.log('❌ JWT verification failed:', err.message)
    return res.status(401).json({ success: false, message: 'Invalid or expired token' })
  }
}

// Restrict routes to specific roles
export function requireRole(...roles) {
  return (req, res, next) => {
    console.log('🧭 Role check - required:', roles, 'current user:', req.user?.role)
    if (!req.user || !roles.includes(req.user.role)) {
      console.log('🚫 Access denied - insufficient role')
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }
    console.log('✅ Role check passed')
    next()
  }
}
