export default (sequelize, DataTypes) => {
  const EntityType = sequelize.define(
    'EntityType',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: 'entity_types',
      underscored: true,
      timestamps: true,
      freezeTableName: true,
    }
  )

  EntityType.associate = (models) => {
    EntityType.hasMany(models.Entity, { foreignKey: 'entity_type_id', as: 'entities' })
  }

  return EntityType
}
