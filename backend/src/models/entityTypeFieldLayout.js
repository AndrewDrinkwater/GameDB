export default (sequelize, DataTypes) => {
  const EntityTypeFieldLayout = sequelize.define(
    'EntityTypeFieldLayout',
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
      entity_type_field_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      section_order: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      column_order: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      field_order: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      priority: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
    },
    {
      tableName: 'entity_type_field_layouts',
      underscored: true,
      timestamps: true,
    },
  )

  EntityTypeFieldLayout.associate = (models) => {
    EntityTypeFieldLayout.belongsTo(models.EntityType, {
      foreignKey: 'entity_type_id',
      as: 'entityType',
    })

    EntityTypeFieldLayout.belongsTo(models.EntityTypeField, {
      foreignKey: 'entity_type_field_id',
      as: 'field',
    })
  }

  return EntityTypeFieldLayout
}
