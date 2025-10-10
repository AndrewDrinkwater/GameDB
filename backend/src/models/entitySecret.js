export default (sequelize, DataTypes) => {
  const EntitySecret = sequelize.define(
    'EntitySecret',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      entity_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      created_by: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
    },
    {
      tableName: 'entity_secrets',
      underscored: true,
      timestamps: true,
      freezeTableName: true,
    }
  )

  EntitySecret.associate = (models) => {
    EntitySecret.belongsTo(models.Entity, { foreignKey: 'entity_id', as: 'entity' })
    EntitySecret.belongsTo(models.User, { foreignKey: 'created_by', as: 'creator' })
  }

  return EntitySecret
}
