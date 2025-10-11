export default (sequelize, DataTypes) => {
  const EntityRelationshipTypeEntityType = sequelize.define(
    'EntityRelationshipTypeEntityType',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      relationship_type_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      entity_type_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      role: {
        type: DataTypes.ENUM('from', 'to'),
        allowNull: false,
      },
    },
    {
      tableName: 'entity_relationship_type_entity_types',
      underscored: true,
      timestamps: true,
      freezeTableName: true,
    },
  )

  EntityRelationshipTypeEntityType.associate = (models) => {
    EntityRelationshipTypeEntityType.belongsTo(models.EntityRelationshipType, {
      foreignKey: 'relationship_type_id',
      as: 'relationshipType',
      onDelete: 'CASCADE',
    })

    EntityRelationshipTypeEntityType.belongsTo(models.EntityType, {
      foreignKey: 'entity_type_id',
      as: 'entityType',
      onDelete: 'CASCADE',
    })
  }

  return EntityRelationshipTypeEntityType
}
