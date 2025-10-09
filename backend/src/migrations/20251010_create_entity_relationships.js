// src/migrations/20251011_create_entity_relationships.js
export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('EntityRelationships', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
      primaryKey: true,
    },
    from_entity: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'Entities', key: 'id' },
      onDelete: 'CASCADE',
    },
    to_entity: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'Entities', key: 'id' },
      onDelete: 'CASCADE',
    },
    relationship_type: {
      type: Sequelize.STRING(100),
      allowNull: false,
      comment: 'e.g. ally_of, enemy_of, member_of, sibling_of',
    },
    bidirectional: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    },
    context: {
      type: Sequelize.JSONB,
      defaultValue: {},
      comment: 'Any custom metadata or context for the relationship',
    },
    createdAt: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.literal('NOW()'),
    },
  })
}

export async function down(queryInterface) {
  await queryInterface.dropTable('EntityRelationships')
}
