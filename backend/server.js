import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { sequelize } from './src/sequelize.js'
import router from './src/routes/index.js'
import { User } from './src/models/user.js' // ensure model loads

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

app.use('/api', router)

app.get('/', (req, res) => {
  res.send('GameDB backend running')
})

const PORT = process.env.PORT || 3000

async function start() {
  try {
    await sequelize.authenticate()
    await sequelize.sync() // create tables if not exist
    console.log('✅ Database connected & synced')
    app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`))
  } catch (err) {
    console.error('❌ Failed to start:', err.message)
  }
}

start()
