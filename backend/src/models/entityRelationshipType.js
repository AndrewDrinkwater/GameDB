export default (sequelize, DataTypes) => {
  const EntityRelationshipType = sequelize.define(
    'EntityRelationshipType',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: 'entity_relationship_types',
      underscored: true,
      timestamps: true,
      freezeTableName: true,
    }
  )

  EntityRelationshipType.associate = (models) => {
    EntityRelationshipType.hasMany(models.EntityRelationship, {
      foreignKey: 'relationship_type_id',
      as: 'relationships',
    })
  }

  return EntityRelationshipType
}
