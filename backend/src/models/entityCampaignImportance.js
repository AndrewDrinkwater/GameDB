export default (sequelize, DataTypes) => {
  const EntityCampaignImportance = sequelize.define(
    'EntityCampaignImportance',
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
      campaign_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      importance: {
        type: DataTypes.ENUM('critical', 'important', 'medium'),
        allowNull: true,
      },
    },
    {
      tableName: 'entity_campaign_importance',
      underscored: true,
      timestamps: true,
      freezeTableName: true,
    },
  )

  EntityCampaignImportance.associate = (models) => {
    EntityCampaignImportance.belongsTo(models.Entity, {
      foreignKey: 'entity_id',
      as: 'entity',
      onDelete: 'CASCADE',
    })
    EntityCampaignImportance.belongsTo(models.Campaign, {
      foreignKey: 'campaign_id',
      as: 'campaign',
      onDelete: 'CASCADE',
    })
  }

  return EntityCampaignImportance
}

