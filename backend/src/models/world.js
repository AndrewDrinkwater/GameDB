import { DataTypes } from 'sequelize'
import { sequelize } from '../sequelize.js'
import { User } from './user.js'

export const World = sequelize.define('World', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: false,
  },
})

// relationships
World.belongsTo(User, { as: 'creator', foreignKey: 'created_by' })
User.hasMany(World, { as: 'worlds', foreignKey: 'created_by' })
