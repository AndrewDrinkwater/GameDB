// server.js
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { initDB, sequelize } from './src/models/index.js'
import router from './src/routes/index.js'

// Load .env only in development
if (process.env.NODE_ENV === 'development') {
  dotenv.config()
}

const app = express()

const allowedOrigins = [
  'http://localhost:5173',
  'https://your-production-domain.com',
  'http://ttrdb.eu-west-2.elasticbeanstalk.com',
]

// Campaign header
const CAMPAIGN_CONTEXT_HEADER = 'X-Campaign-Context-Id'

// CORS
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

// Campaign context extraction
app.use((req, res, next) => {
  const rawValue = req.headers[CAMPAIGN_CONTEXT_HEADER.toLowerCase()]

  if (Array.isArray(rawValue)) {
    req.campaignContextId = rawValue[0] || null
  } else {
    req.campaignContextId = rawValue ? rawValue.trim() : null
  }

  next()
})

// Routes
app.use('/api', router)

// Root
app.get('/', (req, res) => {
  res.send('GameDB backend running')
})

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Not Found' })
})

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ success: false, message: err.message })
})

const PORT = process.env.PORT || 3000

async function start() {
  try {
    await initDB()
    await sequelize.sync()

    console.log('Database connected and synced')

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`)
    })
  } catch (err) {
    console.error('Failed to start:', err.message)
  }
}

start()
