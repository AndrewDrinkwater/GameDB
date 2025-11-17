export default (sequelize, DataTypes) => {
  const EntityTypeField = sequelize.define(
    'EntityTypeField',
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      entity_type_id: {
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
        type: DataTypes.ENUM('string', 'number', 'boolean', 'text', 'date', 'enum', 'reference'),
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
      tableName: 'entity_type_fields',
      freezeTableName: true,
      timestamps: false,
    }
  )

  EntityTypeField.associate = (models) => {
    EntityTypeField.belongsTo(models.EntityType, { foreignKey: 'entity_type_id', as: 'entityType' })

    if (models.EntityType) {
      EntityTypeField.belongsTo(models.EntityType, {
        foreignKey: 'reference_type_id',
        as: 'referenceType',
      })
    }
  }

  return EntityTypeField
}
