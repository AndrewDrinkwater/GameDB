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
      image_data: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      image_mime_type: {
        type: DataTypes.STRING(50),
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
        defaultValue: 'visible',
      },
      read_access: {
        type: DataTypes.ENUM('global', 'selective', 'hidden'),
        allowNull: false,
        defaultValue: 'global',
      },
      write_access: {
        type: DataTypes.ENUM('global', 'selective', 'hidden', 'owner_only'),
        allowNull: false,
        defaultValue: 'global',
      },
      read_campaign_ids: {
        type: DataTypes.ARRAY(DataTypes.UUID),
        allowNull: false,
        defaultValue: [],
      },
      read_user_ids: {
        type: DataTypes.ARRAY(DataTypes.UUID),
        allowNull: false,
        defaultValue: [],
      },
      read_character_ids: {
        type: DataTypes.ARRAY(DataTypes.UUID),
        allowNull: false,
        defaultValue: [],
      },
      write_campaign_ids: {
        type: DataTypes.ARRAY(DataTypes.UUID),
        allowNull: false,
        defaultValue: [],
      },
      write_user_ids: {
        type: DataTypes.ARRAY(DataTypes.UUID),
        allowNull: false,
        defaultValue: [],
      },
      location_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
    },
    {
      tableName: 'entities',
      underscored: true,
      timestamps: true,
      freezeTableName: true,
    }
  )

  Entity.associate = (models) => {
    Entity.belongsTo(models.EntityType, { foreignKey: 'entity_type_id', as: 'entityType' })
    Entity.belongsTo(models.User, { foreignKey: 'created_by', as: 'creator' })
    Entity.belongsTo(models.World, { foreignKey: 'world_id', as: 'world' })
    if (models.Location) {
      Entity.belongsTo(models.Location, { foreignKey: 'location_id', as: 'location' })
    }
    if (models.EntitySecret) {
      Entity.hasMany(models.EntitySecret, {
        foreignKey: 'entity_id',
        as: 'secrets',
        onDelete: 'CASCADE',
      })
    }
    if (models.EntityNote) {
      Entity.hasMany(models.EntityNote, {
        foreignKey: 'entity_id',
        as: 'notes',
        onDelete: 'CASCADE',
      })
    }
    if (models.EntityCampaignImportance) {
      Entity.hasMany(models.EntityCampaignImportance, {
        foreignKey: 'entity_id',
        as: 'campaignImportances',
        onDelete: 'CASCADE',
      })
    }
    if (models.EntityRelationship) {
      Entity.hasMany(models.EntityRelationship, {
        foreignKey: 'from_entity',
        as: 'relationshipsFrom',
      })
      Entity.hasMany(models.EntityRelationship, {
        foreignKey: 'to_entity',
        as: 'relationshipsTo',
      })
    }
  }

  return Entity
}
