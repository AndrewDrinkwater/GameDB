import { DataTypes } from 'sequelize'
import { sequelize } from '../sequelize.js'
import bcrypt from 'bcrypt'

export const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password_hash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('system_admin', 'dungeon_master', 'player'),
    allowNull: false,
    defaultValue: 'player',
  },
})

// helper function to check passwords
User.prototype.validatePassword = async function (password) {
  return bcrypt.compare(password, this.password_hash)
}
