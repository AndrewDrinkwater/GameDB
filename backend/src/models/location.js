// src/models/location.js
export default (sequelize, DataTypes) => {
  const Location = sequelize.define(
    'Location',
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
      location_type_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      parent_id: {
        type: DataTypes.UUID,
        allowNull: true,
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
      coordinates: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Coordinates for map integration (e.g., {x: 100, y: 200})',
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
    },
    {
      tableName: 'locations',
      underscored: true,
      timestamps: true,
      freezeTableName: true,
    }
  )

  Location.associate = (models) => {
    Location.belongsTo(models.World, { foreignKey: 'world_id', as: 'world' })
    Location.belongsTo(models.User, { foreignKey: 'created_by', as: 'creator' })
    Location.belongsTo(models.LocationType, {
      foreignKey: 'location_type_id',
      as: 'locationType',
    })
    Location.belongsTo(models.Location, {
      foreignKey: 'parent_id',
      as: 'parent',
    })
    Location.hasMany(models.Location, {
      foreignKey: 'parent_id',
      as: 'children',
    })

    if (models.Entity) {
      Location.hasMany(models.Entity, {
        foreignKey: 'location_id',
        as: 'entities',
      })
    }
    if (models.LocationCampaignImportance) {
      Location.hasMany(models.LocationCampaignImportance, {
        foreignKey: 'location_id',
        as: 'campaignImportances',
        onDelete: 'CASCADE',
      })
    }
  }

  return Location
}

