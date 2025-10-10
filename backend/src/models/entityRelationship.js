export default (sequelize, DataTypes) => {
  const EntityRelationship = sequelize.define(
    'EntityRelationship',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      from_entity: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      to_entity: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      relationship_type_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      bidirectional: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      context: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
    },
    {
      tableName: 'entity_relationships',
      underscored: true,
      timestamps: true,
      freezeTableName: true,
    }
  )

  EntityRelationship.associate = (models) => {
    EntityRelationship.belongsTo(models.Entity, {
      foreignKey: 'from_entity',
      as: 'from',
    })
    EntityRelationship.belongsTo(models.Entity, {
      foreignKey: 'to_entity',
      as: 'to',
    })
    if (models.EntityRelationshipType) {
      EntityRelationship.belongsTo(models.EntityRelationshipType, {
        foreignKey: 'relationship_type_id',
        as: 'relationshipType',
      })
    }
  }

  return EntityRelationship
}
