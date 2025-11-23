export default (sequelize, DataTypes) => {
  const LocationFollow = sequelize.define(
    'LocationFollow',
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
      location_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      campaign_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
    },
    {
      tableName: 'location_follows',
      underscored: true,
      timestamps: true,
      freezeTableName: true,
      indexes: [
        {
          unique: true,
          fields: ['user_id', 'location_id', 'campaign_id'],
        },
      ],
    },
  )

  LocationFollow.associate = (models) => {
    LocationFollow.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' })
    LocationFollow.belongsTo(models.Location, { foreignKey: 'location_id', as: 'location' })
    LocationFollow.belongsTo(models.Campaign, { foreignKey: 'campaign_id', as: 'campaign' })
  }

  return LocationFollow
}

