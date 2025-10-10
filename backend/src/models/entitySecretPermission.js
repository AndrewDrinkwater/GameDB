export default (sequelize, DataTypes) => {
  const EntitySecretPermission = sequelize.define(
    'EntitySecretPermission',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      secret_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      can_view: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: 'entity_secret_permissions',
      underscored: true,
      timestamps: true,
      freezeTableName: true,
    }
  )

  EntitySecretPermission.associate = (models) => {
    EntitySecretPermission.belongsTo(models.EntitySecret, {
      foreignKey: 'secret_id',
      as: 'secret',
      onDelete: 'CASCADE',
    })
    EntitySecretPermission.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user',
      onDelete: 'CASCADE',
    })
  }

  return EntitySecretPermission
}
