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
  'https://your-production-domain.com', // add your deployed frontend if needed
]

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
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
)

app.use(express.json())

// Simple request logger for debugging
app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.url}`)
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
    await sequelize.sync({ alter: true })
    console.log('✅ Database connected & synced')

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`)
    })
  } catch (err) {
    console.error('❌ Failed to start:', err.message)
  }
}

start()
