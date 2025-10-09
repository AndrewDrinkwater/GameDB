export default (sequelize, DataTypes) => {
  const Campaign = sequelize.define('Campaign', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
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
    Campaign.hasMany(models.Entity, { foreignKey: 'campaign_id', as: 'entities' })
  }

  return Campaign
}
