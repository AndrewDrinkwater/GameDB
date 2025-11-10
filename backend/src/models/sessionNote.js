export default (sequelize, DataTypes) => {
  const SessionNote = sequelize.define(
    'SessionNote',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      campaign_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      session_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      session_title: {
        type: DataTypes.STRING(255),
        allowNull: false,
        defaultValue: 'Session note',
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: '',
      },
      mentions: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      created_by: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      updated_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
    },
    {
      tableName: 'session_notes',
      underscored: true,
      timestamps: true,
    },
  )

  SessionNote.associate = (models) => {
    SessionNote.belongsTo(models.Campaign, { foreignKey: 'campaign_id', as: 'campaign' })
    SessionNote.belongsTo(models.User, { foreignKey: 'created_by', as: 'author' })
    SessionNote.belongsTo(models.User, { foreignKey: 'updated_by', as: 'lastEditor' })
  }

  return SessionNote
}
