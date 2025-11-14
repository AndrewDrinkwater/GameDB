export default (sequelize, DataTypes) => {
  const EntityCollection = sequelize.define(
    'EntityCollection',
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
      owner_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      name: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      shared: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      selection_mode: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: 'manual',
      },
      criteria: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      entity_ids: {
        type: DataTypes.ARRAY(DataTypes.UUID),
        allowNull: false,
        defaultValue: [],
      },
    },
    {
      tableName: 'entity_collections',
      underscored: true,
      timestamps: true,
      freezeTableName: true,
    },
  )

  EntityCollection.associate = (models) => {
    EntityCollection.belongsTo(models.World, { foreignKey: 'world_id', as: 'world' })
    EntityCollection.belongsTo(models.User, { foreignKey: 'owner_id', as: 'owner' })
  }

  return EntityCollection
}
