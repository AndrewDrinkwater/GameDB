export default (sequelize, DataTypes) => {
  const EntityFollow = sequelize.define(
    'EntityFollow',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      entity_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      campaign_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
    },
    {
      tableName: 'entity_follows',
      underscored: true,
      timestamps: true,
      freezeTableName: true,
    },
  )

  EntityFollow.associate = (models) => {
    EntityFollow.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' })
    EntityFollow.belongsTo(models.Entity, { foreignKey: 'entity_id', as: 'entity' })
    EntityFollow.belongsTo(models.Campaign, { foreignKey: 'campaign_id', as: 'campaign' })
  }

  return EntityFollow
}

