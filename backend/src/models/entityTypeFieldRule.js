export default (sequelize, DataTypes) => {
  const EntityTypeFieldRule = sequelize.define(
    'EntityTypeFieldRule',
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
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      match_mode: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'all',
      },
      priority: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      enabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      conditions: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      actions: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
      },
    },
    {
      tableName: 'entity_type_field_rules',
      underscored: true,
      timestamps: true,
    },
  )

  EntityTypeFieldRule.associate = (models) => {
    EntityTypeFieldRule.belongsTo(models.EntityType, {
      foreignKey: 'entity_type_id',
      as: 'entityType',
    })
  }

  return EntityTypeFieldRule
}
