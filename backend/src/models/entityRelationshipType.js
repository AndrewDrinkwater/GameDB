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
      },
      from_name: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      to_name: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      world_id: {
        type: DataTypes.UUID,
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

    if (models.World) {
      EntityRelationshipType.belongsTo(models.World, {
        foreignKey: 'world_id',
        as: 'world',
      })
    }

    if (models.EntityRelationshipTypeEntityType) {
      EntityRelationshipType.hasMany(models.EntityRelationshipTypeEntityType, {
        foreignKey: 'relationship_type_id',
        as: 'entityTypeRules',
        onDelete: 'CASCADE',
        hooks: true,
      })

      EntityRelationshipType.belongsToMany(models.EntityType, {
        through: models.EntityRelationshipTypeEntityType,
        foreignKey: 'relationship_type_id',
        otherKey: 'entity_type_id',
        as: 'entityTypes',
      })
    }
  }

  return EntityRelationshipType
}
