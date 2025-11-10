export default (sequelize, DataTypes) => {
  const EntityNote = sequelize.define(
    'EntityNote',
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
      tableName: 'entity_notes',
      underscored: true,
      timestamps: true,
    },
  )

  EntityNote.associate = (models) => {
    EntityNote.belongsTo(models.Entity, { foreignKey: 'entity_id', as: 'entity' })
    EntityNote.belongsTo(models.User, { foreignKey: 'created_by', as: 'author' })
    EntityNote.belongsTo(models.Character, { foreignKey: 'character_id', as: 'character' })
    EntityNote.belongsTo(models.Campaign, { foreignKey: 'campaign_id', as: 'campaign' })
  }

  return EntityNote
}
