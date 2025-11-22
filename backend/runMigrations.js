// runMigrations.js
import fs from 'fs'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { Sequelize } from 'sequelize'
import dotenv from 'dotenv'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const migrationsDir = path.join(__dirname, 'src', 'migrations')

// --- Connect to DB ---
// Ensure password is always a string (required by PostgreSQL SCRAM authentication)
// If DB_PASS is undefined or null, use empty string; otherwise convert to string
const dbPassword = process.env.DB_PASS == null ? '' : String(process.env.DB_PASS)

const sequelize = new Sequelize({
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: dbPassword,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  dialect: 'postgres',
  logging: console.log,
})

async function runMigrations() {
  console.log('🚀 Running migrations from:', migrationsDir)
  const queryInterface = sequelize.getQueryInterface()

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.js'))
    .sort()

  for (const file of files) {
    const migrationPath = path.join(migrationsDir, file)
    const fileUrl = pathToFileURL(migrationPath).href

    console.log(`▶️ Running migration: ${file}`)
    try {
      const migration = await import(fileUrl)
      if (typeof migration.up === 'function') {
        await migration.up(queryInterface, Sequelize)
        console.log(`✅ Completed: ${file}`)
      } else {
        console.warn(`⚠️ Skipping ${file} — no "up" function found`)
      }
    } catch (err) {
      console.error(`❌ Failed migration ${file}:`, err.message)
      throw err // stop on failure
    }
  }

  console.log('🎉 All migrations completed successfully!')
}

try {
  await runMigrations()
} catch (err) {
  console.error('❌ Migration failed:', err)
} finally {
  await sequelize.close()
}
