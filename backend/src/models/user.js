// src/models/user.js
export default (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    username: { type: DataTypes.STRING, unique: true, allowNull: false },
    password_hash: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.STRING, defaultValue: 'player' },
  })

  User.associate = (models) => {
    User.hasMany(models.World, {
      foreignKey: 'created_by',
      as: 'worlds',
    })
  }

  return User
}
