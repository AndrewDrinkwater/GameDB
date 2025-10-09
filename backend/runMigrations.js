import { Sequelize } from 'sequelize'
import dotenv from 'dotenv'
import * as migration from './src/migrations/20251008_update_worlds_add_system_status.js'

dotenv.config()

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: console.log,
})

try {
  console.log('🚀 Running manual migration...')
  await migration.up(sequelize.getQueryInterface(), Sequelize)
  console.log('✅ Migration completed successfully')
} catch (err) {
  console.error('❌ Migration failed:', err)
} finally {
  await sequelize.close()
}
