export default (sequelize, DataTypes) => {
  const LocationCampaignImportance = sequelize.define(
    'LocationCampaignImportance',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      location_id: {
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
      tableName: 'location_campaign_importance',
      underscored: true,
      timestamps: true,
      freezeTableName: true,
    },
  )

  LocationCampaignImportance.associate = (models) => {
    LocationCampaignImportance.belongsTo(models.Location, {
      foreignKey: 'location_id',
      as: 'location',
      onDelete: 'CASCADE',
    })
    LocationCampaignImportance.belongsTo(models.Campaign, {
      foreignKey: 'campaign_id',
      as: 'campaign',
      onDelete: 'CASCADE',
    })
  }

  return LocationCampaignImportance
}

