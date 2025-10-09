// src/models/user.js
import { DataTypes } from 'sequelize'

export default (sequelize) => {
  const User = sequelize.define(
    'User',
    {
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
      email: {                      // ✅ REQUIRED
        type: DataTypes.STRING,
        allowNull: true,
      },
      role: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'player',
      },
    },
    {
      tableName: 'Users',           // ✅ match existing DB table
      timestamps: true,
    }
  )

  return User
}
