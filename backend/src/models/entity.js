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
      created_by: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      entity_type_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      visibility: {
        type: DataTypes.ENUM('hidden', 'visible', 'partial'),
        allowNull: false,
        defaultValue: 'hidden',
      },
    },
    {
      tableName: 'entities',
      underscored: true,
      timestamps: true,
    }
  )

  Entity.associate = (models) => {
    Entity.belongsTo(models.World, { foreignKey: 'world_id', as: 'world' })
    Entity.belongsTo(models.User, { foreignKey: 'created_by', as: 'creator' })
    if (models.EntityType) {
      Entity.belongsTo(models.EntityType, { foreignKey: 'entity_type_id', as: 'entityType' })
    }
    if (models.EntitySecret) {
      Entity.hasMany(models.EntitySecret, { foreignKey: 'entity_id', as: 'secrets', onDelete: 'CASCADE' })
    }
    if (models.Campaign) {
      Entity.belongsToMany(models.Campaign, {
        through: 'CampaignEntities',
        foreignKey: 'entity_id',
        otherKey: 'campaign_id',
        as: 'campaigns',
      })
    }
  }

  return Entity
}
