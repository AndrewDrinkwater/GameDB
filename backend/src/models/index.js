// src/models/index.js
import { Sequelize, DataTypes } from 'sequelize'
import dotenv from 'dotenv'
dotenv.config()

import UserModel from './user.js'
import WorldModel from './world.js'

// Create Sequelize instance
export const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
})

// Initialise models
export const User = UserModel(sequelize, DataTypes)
export const World = WorldModel(sequelize, DataTypes)

// Setup associations
if (User.associate) User.associate({ World })
if (World.associate) World.associate({ User })

// Sync schema if needed
export async function initDB() {
  try {
    await sequelize.authenticate()
    console.log('✅ Database connected')
  } catch (err) {
    console.error('❌ DB connection failed:', err.message)
  }
}

export default { sequelize, User, World }
