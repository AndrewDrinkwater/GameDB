export default (sequelize, DataTypes) => {
  const Character = sequelize.define('Character', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: { type: DataTypes.STRING, allowNull: false },
    race: { type: DataTypes.STRING },
    class: { type: DataTypes.STRING },
    level: { type: DataTypes.INTEGER, defaultValue: 1 },
    alignment: { type: DataTypes.STRING },
    notes: { type: DataTypes.TEXT },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  })

  Character.associate = (models) => {
    Character.belongsTo(models.User, { foreignKey: 'user_id', as: 'player' })
    Character.belongsTo(models.Campaign, { foreignKey: 'campaign_id', as: 'campaign' })
  }

  return Character
}
