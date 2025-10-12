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
        defaultValue: 'user',
      },
    },
    {
      tableName: 'Users',           // ✅ match existing DB table
      timestamps: true,
    }
  )

  User.associate = (models) => {
    if (models.UserCampaignRole) {
      User.hasMany(models.UserCampaignRole, { foreignKey: 'user_id', as: 'campaignRoles' })
    }

    if (models.EntityListPreference) {
      User.hasMany(models.EntityListPreference, {
        foreignKey: 'user_id',
        as: 'entityListPreferences',
        onDelete: 'CASCADE',
        hooks: true,
      })
    }
  }

  return User
}
