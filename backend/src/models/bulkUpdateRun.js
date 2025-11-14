export default (sequelize, DataTypes) => {
  const BulkUpdateRun = sequelize.define(
    'BulkUpdateRun',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      world_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      campaign_context_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      description: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      entity_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      reverted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      tableName: 'bulk_update_runs',
      underscored: true,
      timestamps: true,
      freezeTableName: true,
    },
  )

  BulkUpdateRun.associate = (models) => {
    BulkUpdateRun.belongsTo(models.World, { foreignKey: 'world_id', as: 'world' })
    BulkUpdateRun.belongsTo(models.User, { foreignKey: 'user_id', as: 'actor' })
    BulkUpdateRun.hasMany(models.BulkUpdateChange, { foreignKey: 'run_id', as: 'changes' })
  }

  return BulkUpdateRun
}
