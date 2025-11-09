export default (sequelize, DataTypes) => {
  const EntityType = sequelize.define(
    'EntityType',
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
      world_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: 'entity_types',
      underscored: true,
      timestamps: true,
      freezeTableName: true,
    }
  )

  EntityType.associate = (models) => {
    EntityType.hasMany(models.Entity, { foreignKey: 'entity_type_id', as: 'entities' })
    EntityType.belongsTo(models.World, { foreignKey: 'world_id', as: 'world' })

    if (models.EntityTypeField) {
      EntityType.hasMany(models.EntityTypeField, {
        foreignKey: 'entity_type_id',
        as: 'fields',
        onDelete: 'CASCADE',
        hooks: true,
      })
    }

    if (models.EntityListPreference) {
      EntityType.hasMany(models.EntityListPreference, {
        foreignKey: 'entity_type_id',
        as: 'listPreferences',
        onDelete: 'CASCADE',
        hooks: true,
      })
    }

    if (models.EntityRelationshipTypeEntityType) {
      EntityType.hasMany(models.EntityRelationshipTypeEntityType, {
        foreignKey: 'entity_type_id',
        as: 'relationshipTypeRules',
        onDelete: 'CASCADE',
        hooks: true,
      })

      EntityType.belongsToMany(models.EntityRelationshipType, {
        through: models.EntityRelationshipTypeEntityType,
        foreignKey: 'entity_type_id',
        otherKey: 'relationship_type_id',
        as: 'relationshipTypes',
      })
    }
  }

  return EntityType
}
