// src/middleware/authMiddleware.js
import jwt from 'jsonwebtoken'
import { cfg } from '../config/env.js'

// 🔍 Auth middleware supporting both Bearer and gamedb_session tokens
export function authenticate(req, res, next) {
  // Capture all possible token sources
  const authHeader = req.headers.authorization
  const sessionHeader = req.headers['gamedb_session']
  const cookieToken = req.cookies?.gamedb_session

  console.log('🔐 Incoming headers:', {
    authorization: authHeader,
    gamedb_session: sessionHeader,
  })

  // Extract the token from whichever source exists
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : sessionHeader || cookieToken

  if (!token) {
    console.log('❌ Missing or malformed token (Authorization or gamedb_session)')
    return res
      .status(401)
      .json({ success: false, message: 'Missing or invalid token' })
  }

  try {
    console.log('🧩 Using JWT secret:', cfg.jwtSecret)
    const decoded = jwt.verify(token, cfg.jwtSecret)
    console.log('✅ Token verified successfully. Payload:', decoded)
    req.user = decoded
    next()
  } catch (err) {
    console.log('❌ JWT verification failed:', err.message)
    return res
      .status(401)
      .json({ success: false, message: 'Invalid or expired token' })
  }
}

// Restrict routes to specific roles
export function requireRole(...roles) {
  return (req, res, next) => {
    console.log('🧭 Role check - required:', roles, 'current user:', req.user?.role)
    if (!req.user || !roles.includes(req.user.role)) {
      console.log('🚫 Access denied - insufficient role')
      return res
        .status(403)
        .json({ success: false, message: 'Forbidden' })
    }
    console.log('✅ Role check passed')
    next()
  }
}
