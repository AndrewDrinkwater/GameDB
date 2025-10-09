export default (sequelize, DataTypes) => {
  const UserCampaignRole = sequelize.define('UserCampaignRole', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    campaign_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM('dm', 'player', 'observer'),
      allowNull: false,
      defaultValue: 'player',
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'UserCampaignRoles',
    timestamps: false,
  })

  UserCampaignRole.associate = (models) => {
    UserCampaignRole.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user',
    })
    UserCampaignRole.belongsTo(models.Campaign, {
      foreignKey: 'campaign_id',
      as: 'campaign',
    })
  }

  return UserCampaignRole
}
