// src/migrations/20251011_create_entity_relationships.js
export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('entity_relationship_types', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
      primaryKey: true,
    },
    name: {
      type: Sequelize.STRING(100),
      allowNull: false,
      unique: true,
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('NOW()'),
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('NOW()'),
    },
  })

  await queryInterface.createTable('entity_relationships', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
      primaryKey: true,
    },
    from_entity: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'entities', key: 'id' },
      onDelete: 'CASCADE',
    },
    to_entity: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'entities', key: 'id' },
      onDelete: 'CASCADE',
    },
    relationship_type_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'entity_relationship_types', key: 'id' },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    },
    bidirectional: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    context: {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: Sequelize.literal("'{}'::jsonb"),
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('NOW()'),
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('NOW()'),
    },
  })

  await queryInterface.addIndex('entity_relationships', ['from_entity'], { name: 'idx_entity_relationships_from' })
  await queryInterface.addIndex('entity_relationships', ['to_entity'], { name: 'idx_entity_relationships_to' })
}

export async function down(queryInterface) {
  await queryInterface.removeIndex('entity_relationships', 'idx_entity_relationships_to')
  await queryInterface.removeIndex('entity_relationships', 'idx_entity_relationships_from')
  await queryInterface.dropTable('entity_relationships')
  await queryInterface.dropTable('entity_relationship_types')
}
