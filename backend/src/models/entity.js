// src/models/entity.js
export default (sequelize, DataTypes) => {
  const Entity = sequelize.define(
    'Entity',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      world_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      type: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      description: DataTypes.TEXT,
      metadata: {
        type: DataTypes.JSONB,
        defaultValue: {},
      },
      visibility: {
        type: DataTypes.ENUM('visible', 'hidden', 'partial'),
        defaultValue: 'hidden',
      },
    },
    {
      tableName: 'Entities',   // 👈 EXACT match to your migration
      freezeTableName: true,   // 👈 prevents Sequelize from pluralising/lowercasing
      timestamps: true,
    }
  )

  return Entity
}
