export default (sequelize, DataTypes) => {
  const BulkUpdateChange = sequelize.define(
    'BulkUpdateChange',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      run_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      entity_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      old_read_access: {
        type: DataTypes.ENUM('global', 'selective', 'hidden'),
        allowNull: false,
      },
      old_write_access: {
        type: DataTypes.ENUM('global', 'selective', 'hidden', 'owner_only'),
        allowNull: false,
      },
      old_read_campaign_ids: {
        type: DataTypes.ARRAY(DataTypes.UUID),
        allowNull: false,
        defaultValue: [],
      },
      old_read_user_ids: {
        type: DataTypes.ARRAY(DataTypes.UUID),
        allowNull: false,
        defaultValue: [],
      },
      old_read_character_ids: {
        type: DataTypes.ARRAY(DataTypes.UUID),
        allowNull: false,
        defaultValue: [],
      },
      old_write_campaign_ids: {
        type: DataTypes.ARRAY(DataTypes.UUID),
        allowNull: false,
        defaultValue: [],
      },
      old_write_user_ids: {
        type: DataTypes.ARRAY(DataTypes.UUID),
        allowNull: false,
        defaultValue: [],
      },
    },
    {
      tableName: 'bulk_update_changes',
      underscored: true,
      timestamps: true,
      freezeTableName: true,
    },
  )

  BulkUpdateChange.associate = (models) => {
    BulkUpdateChange.belongsTo(models.BulkUpdateRun, { foreignKey: 'run_id', as: 'run' })
    BulkUpdateChange.belongsTo(models.Entity, { foreignKey: 'entity_id', as: 'entity' })
  }

  return BulkUpdateChange
}
