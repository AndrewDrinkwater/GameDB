// server.js
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { initDB, sequelize } from './src/models/index.js'
import router from './src/routes/index.js'

// Load .env only in development
if (process.env.NODE_ENV === 'development') {
  dotenv.config()
}

// Runtime env debug
console.log('RUNTIME ENV:', {
  DB_HOST: process.env.DB_HOST || '(missing)',
  DB_PORT: process.env.DB_PORT || '(missing)',
  DB_NAME: process.env.DB_NAME || '(missing)',
  DB_USER: process.env.DB_USER || '(missing)',
  DB_PASS: process.env.DB_PASS ? '(present)' : '(missing)',
  DATABASE_URL: process.env.DATABASE_URL || '(not set)',
  NODE_ENV: process.env.NODE_ENV || '(missing)',
  PORT: process.env.PORT || '(missing)',
})

const app = express()

const allowedOrigins = [
  'http://localhost:5173',
  'http://ttrdb.eu-west-2.elasticbeanstalk.com',
  'https://your-production-domain.com'
]

const CAMPAIGN_CONTEXT_HEADER = 'X-Campaign-Context-Id'

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true)
      }
      console.warn('Blocked by CORS:', origin)
      return callback(new Error('Not allowed by CORS'))
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', CAMPAIGN_CONTEXT_HEADER],
  })
)

app.use(express.json())

// Campaign context
app.use((req, res, next) => {
  const rawValue = req.headers[CAMPAIGN_CONTEXT_HEADER.toLowerCase()]
  if (Array.isArray(rawValue)) {
    req.campaignContextId = rawValue[0] || null
  } else {
    req.campaignContextId = rawValue ? rawValue.trim() : null
  }
  next()
})

// API routes
app.use('/api', router)

// ---------------------------------------
// Serve Frontend (React build)
// ---------------------------------------
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const frontendPath = path.join(__dirname, 'dist')
app.use(express.static(frontendPath))

// Catch-all for React router (excluding API routes)
app.get(/(.*)/, (req, res, next) => {
  if (req.url.startsWith('/api')) return next()
  res.sendFile(path.join(frontendPath, 'index.html'))
})



// ---------------------------------------

const PORT = process.env.PORT || 3000

async function start() {
  try {
    console.log('Attempting database connection...')
    await initDB()

    await sequelize.sync()
    console.log('Database connected and synced')

    console.log('Starting server...')
    app.listen(PORT, () => {
      console.log('Server listening on port', PORT)
    })
  } catch (err) {
    console.error('Failed to start:', err.message)
  }
}

start()
