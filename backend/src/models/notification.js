export default (sequelize, DataTypes) => {
  const Notification = sequelize.define(
    'Notification',
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
      type: {
        type: DataTypes.STRING(100),
        allowNull: false,
        // Extensible: 'entity_comment', 'entity_mention_entity_note', 'entity_mention_session_note', 'session_note_added'
        // Future: 'message_received', 'base_resource_available', etc.
      },
      campaign_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      read: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      read_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
        // Stores all context including target_id, target_type, entity data, author data, etc.
      },
      action_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
    },
    {
      tableName: 'notifications',
      underscored: true,
      timestamps: true,
      freezeTableName: true,
    },
  )

  Notification.associate = (models) => {
    Notification.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' })
    Notification.belongsTo(models.Campaign, { foreignKey: 'campaign_id', as: 'campaign' })
    // No direct foreign keys to Entity, EntityNote, SessionNote - uses metadata JSONB instead for extensibility
  }

  return Notification
}

