export default (sequelize, DataTypes) => {
  const LocationNote = sequelize.define(
    'LocationNote',
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
      character_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      created_by: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      share_type: {
        type: DataTypes.ENUM('private', 'companions', 'dm', 'party'),
        allowNull: false,
        defaultValue: 'private',
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      mentions: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
      },
    },
    {
      tableName: 'location_notes',
      underscored: true,
      timestamps: true,
    },
  )

  LocationNote.associate = (models) => {
    LocationNote.belongsTo(models.Location, { foreignKey: 'location_id', as: 'location' })
    LocationNote.belongsTo(models.User, { foreignKey: 'created_by', as: 'author' })
    LocationNote.belongsTo(models.Character, { foreignKey: 'character_id', as: 'character' })
    LocationNote.belongsTo(models.Campaign, { foreignKey: 'campaign_id', as: 'campaign' })
  }

  return LocationNote
}

