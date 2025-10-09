export default (sequelize, DataTypes) => {
  const EntityRelationship = sequelize.define('EntityRelationship', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    from_entity: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'Entities', key: 'id' },
    },
    to_entity: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'Entities', key: 'id' },
    },
    relationship_type: {
      type: DataTypes.STRING(100),
      allowNull: false, // e.g. 'ally_of', 'enemy_of', 'member_of'
    },
    bidirectional: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    context: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'entity_relationships',
    timestamps: false,
  })

  // Associations
  EntityRelationship.associate = (models) => {
    EntityRelationship.belongsTo(models.Entity, {
      foreignKey: 'from_entity',
      as: 'fromEntity',
    })
    EntityRelationship.belongsTo(models.Entity, {
      foreignKey: 'to_entity',
      as: 'toEntity',
    })
  }

  return EntityRelationship
}
