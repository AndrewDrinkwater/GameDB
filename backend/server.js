// server.js
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { initDB, sequelize } from './src/models/index.js'
import router from './src/routes/index.js'
import entityRoutes from './src/routes/entities.js'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

// ─────────────────────────────────────────────
// Simple request logger for debugging
// ─────────────────────────────────────────────
app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.url}`)
  next()
})

// ─────────────────────────────────────────────
// API Routes (ORDER MATTERS!)
// Mount the Entity routes FIRST so they don't get shadowed by /api router
// ─────────────────────────────────────────────
app.use('/api/worlds/:worldId/entities', entityRoutes)
app.use('/api', router)

// ─────────────────────────────────────────────
// Root route for sanity check
// ─────────────────────────────────────────────
app.get('/', (req, res) => {
  res.send('GameDB backend running')
})

// ─────────────────────────────────────────────
// 404 handler for unknown routes
// ─────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Not Found' })
})

// ─────────────────────────────────────────────
// Global error handler
// ─────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('🔥 Unhandled error:', err)
  res
    .status(500)
    .json({ success: false, message: err.message || 'Internal Server Error' })
})

// ─────────────────────────────────────────────
// Start the server
// ─────────────────────────────────────────────
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
