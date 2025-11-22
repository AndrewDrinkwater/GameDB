// src/models/locationTypeField.js
export default (sequelize, DataTypes) => {
  const LocationTypeField = sequelize.define(
    'LocationTypeField',
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      location_type_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      label: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      data_type: {
        type: DataTypes.ENUM('string', 'number', 'boolean', 'text', 'date', 'enum', 'entity_reference', 'location_reference'),
        allowNull: false,
      },
      reference_type_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      reference_filter: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      options: {
        type: DataTypes.JSONB,
        defaultValue: {},
      },
      required: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      default_value: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      visible_by_default: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      sort_order: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
    },
    {
      tableName: 'location_type_fields',
      freezeTableName: true,
      timestamps: false,
    }
  )

  LocationTypeField.associate = (models) => {
    LocationTypeField.belongsTo(models.LocationType, {
      foreignKey: 'location_type_id',
      as: 'locationType',
    })

    if (models.EntityType) {
      LocationTypeField.belongsTo(models.EntityType, {
        foreignKey: 'reference_type_id',
        as: 'entityReferenceType',
        constraints: false,
      })
    }

    if (models.LocationType) {
      LocationTypeField.belongsTo(models.LocationType, {
        foreignKey: 'reference_type_id',
        as: 'locationReferenceType',
        constraints: false,
      })
    }
  }

  return LocationTypeField
}

