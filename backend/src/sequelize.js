import { Sequelize } from 'sequelize'
import dotenv from 'dotenv'
dotenv.config()

// Ensure password is always a string (required by PostgreSQL SCRAM authentication)
// If DB_PASS is undefined or null, use empty string; otherwise convert to string
const dbPassword = process.env.DB_PASS == null ? '' : String(process.env.DB_PASS)

export const sequelize = new Sequelize({
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: dbPassword,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  dialect: 'postgres',
  logging: false,
})
