export default (sequelize, DataTypes) => {
  const EntityListPreference = sequelize.define(
    'EntityListPreference',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      entity_type_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      columns: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
      },
    },
    {
      tableName: 'entity_list_preferences',
      underscored: true,
      timestamps: true,
      freezeTableName: true,
    },
  )

  EntityListPreference.associate = (models) => {
    if (models.EntityType) {
      EntityListPreference.belongsTo(models.EntityType, {
        foreignKey: 'entity_type_id',
        as: 'entityType',
      })
    }

    if (models.User) {
      EntityListPreference.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user',
      })
    }
  }

  return EntityListPreference
}
