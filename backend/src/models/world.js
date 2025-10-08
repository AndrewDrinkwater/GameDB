// src/models/world.js
export default (sequelize, DataTypes) => {
  const World = sequelize.define('World', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT },
    created_by: { type: DataTypes.UUID, allowNull: false },
  })

  World.associate = (models) => {
    World.belongsTo(models.User, {
      foreignKey: 'created_by',
      as: 'creator',
    })
  }

  return World
}
