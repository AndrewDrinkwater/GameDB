import dotenv from 'dotenv'
dotenv.config()

const TRUE_FLAG_VALUES = new Set(['true', '1', 'yes', 'on'])

const parseFeatureFlag = (value, defaultValue = false) => {
  if (value === undefined || value === null) return defaultValue
  if (typeof value === 'boolean') return value

  const normalised = String(value).trim().toLowerCase()
  if (!normalised) return defaultValue

  if (TRUE_FLAG_VALUES.has(normalised)) return true
  if (normalised === 'false' || normalised === '0' || normalised === 'off' || normalised === 'no') {
    return false
  }

  return defaultValue
}

export const cfg = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  dbUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || 'devsecret',
  jwtExpiry: process.env.JWT_EXPIRY || '8h',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  features: {
    rel_builder_v2: parseFeatureFlag(process.env.FEATURE_REL_BUILDER_V2),
  },
}

export const isFeatureEnabled = (flagName) => Boolean(cfg.features?.[flagName])
