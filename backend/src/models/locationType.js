// src/models/locationType.js
export default (sequelize, DataTypes) => {
  const LocationType = sequelize.define(
    'LocationType',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      world_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      parent_type_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      sort_order: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      focus: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
    },
    {
      tableName: 'location_types',
      underscored: true,
      timestamps: true,
      freezeTableName: true,
    }
  )

  LocationType.associate = (models) => {
    LocationType.belongsTo(models.World, { foreignKey: 'world_id', as: 'world' })
    LocationType.belongsTo(models.LocationType, {
      foreignKey: 'parent_type_id',
      as: 'parentType',
    })
    LocationType.hasMany(models.LocationType, {
      foreignKey: 'parent_type_id',
      as: 'childTypes',
    })
    LocationType.hasMany(models.Location, {
      foreignKey: 'location_type_id',
      as: 'locations',
    })

    if (models.LocationTypeField) {
      LocationType.hasMany(models.LocationTypeField, {
        foreignKey: 'location_type_id',
        as: 'fields',
        onDelete: 'CASCADE',
        hooks: true,
      })
    }
  }

  return LocationType
}

