export default (sequelize, DataTypes) => {
  const LocationCollection = sequelize.define(
    'LocationCollection',
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
      location_ids: {
        type: DataTypes.ARRAY(DataTypes.UUID),
        allowNull: false,
        defaultValue: [],
      },
    },
    {
      tableName: 'location_collections',
      underscored: true,
      timestamps: true,
      freezeTableName: true,
    },
  )

  LocationCollection.associate = (models) => {
    LocationCollection.belongsTo(models.World, { foreignKey: 'world_id', as: 'world' })
    LocationCollection.belongsTo(models.User, { foreignKey: 'owner_id', as: 'owner' })
  }

  return LocationCollection
}

