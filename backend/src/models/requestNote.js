export default (sequelize, DataTypes) => {
  const RequestNote = sequelize.define(
    'RequestNote',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      request_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      created_by: {
        type: DataTypes.UUID,
        allowNull: false,
      },
    },
    {
      tableName: 'request_notes',
      underscored: true,
      timestamps: true,
    },
  )

  RequestNote.associate = (models) => {
    RequestNote.belongsTo(models.Request, { foreignKey: 'request_id', as: 'request' })
    RequestNote.belongsTo(models.User, { foreignKey: 'created_by', as: 'author' })
  }

  return RequestNote
}

