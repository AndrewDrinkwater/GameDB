// server.js
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { initDB, sequelize } from './src/models/index.js'
import router from './src/routes/index.js'

dotenv.config()

const app = express()

// ✅ Proper CORS configuration for authenticated frontend
const allowedOrigins = [
  'http://localhost:5173',
  'https://your-production-domain.com',
  'http://gamedb.eu-west-2.elasticbeanstalk.com', // add your deployed frontend if needed
]

const CAMPAIGN_CONTEXT_HEADER = 'X-Campaign-Context-Id'

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow Postman or local scripts with no origin
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        console.warn('🚫 Blocked by CORS:', origin)
        callback(new Error('Not allowed by CORS'))
      }
    },
    credentials: true, // ✅ allows cookies / Authorization header
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', CAMPAIGN_CONTEXT_HEADER],
  })
)

app.use(express.json())

app.use((req, res, next) => {
  const rawHeader = req.headers[CAMPAIGN_CONTEXT_HEADER.toLowerCase()]

  if (Array.isArray(rawHeader)) {
    req.campaignContextId = rawHeader.length > 0 ? rawHeader[0] : ''
  } else {
    req.campaignContextId = rawHeader || ''
  }

  if (typeof req.campaignContextId === 'string') {
    req.campaignContextId = req.campaignContextId.trim()
  }

  if (!req.campaignContextId) {
    req.campaignContextId = null
  }

  next()
})

// API routes
app.use('/api', router)

// Root route
app.get('/', (req, res) => {
  res.send('GameDB backend running')
})

// Fallback for unknown routes
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Not Found' })
})

// Global error handler
app.use((err, req, res, next) => {
  console.error('🔥 Unhandled error:', err)
  res
    .status(500)
    .json({ success: false, message: err.message || 'Internal Server Error' })
})

const PORT = process.env.PORT || 3000

async function start() {
  try {
    await initDB()

    // Using `alter: true` triggers `ALTER TABLE ... USING` queries against the enum
    // columns defined in our models. Postgres happily accepts those statements, but
    // CockroachDB (the database that backs the local environment in these kata
    // containers) does not support that syntax which caused the server to crash
    // before it could start listening for requests. We only need Sequelize to
    // ensure the schema exists in development—the migrations handle structural
    // changes—so a plain `sync()` call is sufficient and compatible everywhere.
    await sequelize.sync()
    console.log('✅ Database connected & synced')

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`)
    })
  } catch (err) {
    console.error('❌ Failed to start:', err.message)
  }
}

start()
