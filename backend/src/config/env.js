import dotenv from 'dotenv'
dotenv.config()

export const cfg = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  dbUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || 'devsecret',
  jwtExpiry: process.env.JWT_EXPIRY || '8h',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
}
