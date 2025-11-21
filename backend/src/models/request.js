export default (sequelize, DataTypes) => {
  const Request = sequelize.define(
    'Request',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      type: {
        type: DataTypes.ENUM('bug', 'feature'),
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('open', 'in_progress', 'testing', 'resolved', 'closed', 'backlog'),
        allowNull: false,
        defaultValue: 'open',
      },
      created_by: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      assigned_to: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      tester_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      priority: {
        type: DataTypes.ENUM('low', 'medium', 'high'),
        allowNull: true,
      },
      is_in_backlog: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      tableName: 'requests',
      underscored: true,
      timestamps: true,
    },
  )

  Request.associate = (models) => {
    Request.belongsTo(models.User, { foreignKey: 'created_by', as: 'creator' })
    Request.belongsTo(models.User, { foreignKey: 'assigned_to', as: 'assignee' })
    Request.belongsTo(models.User, { foreignKey: 'tester_id', as: 'tester' })
    Request.hasMany(models.RequestNote, { foreignKey: 'request_id', as: 'notes' })
  }

  return Request
}

