export default (sequelize, DataTypes) => {
  const Campaign = sequelize.define('Campaign', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    world_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    name: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT },
    status: {
      type: DataTypes.ENUM('draft', 'active', 'archived'),
      defaultValue: 'draft',
    },
  })

  Campaign.associate = (models) => {
    Campaign.belongsTo(models.World, { foreignKey: 'world_id', as: 'world' })
    Campaign.hasMany(models.Character, { foreignKey: 'campaign_id', as: 'characters' })
    if (models.User) {
      Campaign.belongsTo(models.User, { foreignKey: 'created_by', as: 'owner' })
    }

    if (models.UserCampaignRole) {
      Campaign.hasMany(models.UserCampaignRole, { foreignKey: 'campaign_id', as: 'members' })
    }

    if (models.SessionNote) {
      Campaign.hasMany(models.SessionNote, {
        foreignKey: 'campaign_id',
        as: 'sessionNotes',
      })
    }

    if (models.EntityCampaignImportance) {
      Campaign.hasMany(models.EntityCampaignImportance, {
        foreignKey: 'campaign_id',
        as: 'entityImportances',
        onDelete: 'CASCADE',
      })
    }
  }

  return Campaign
}
