// src/migrations/20251021_create_entity_list_preferences.js
export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('entity_list_preferences', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
      primaryKey: true,
    },
    entity_type_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'entity_types', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    user_id: {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'Users', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    columns: {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: Sequelize.literal("'[]'::jsonb"),
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

  await queryInterface.addConstraint('entity_list_preferences', {
    fields: ['entity_type_id', 'user_id'],
    type: 'unique',
    name: 'entity_list_preferences_unique_scope',
  })

  await queryInterface.addIndex('entity_list_preferences', ['user_id'], {
    name: 'entity_list_preferences_user_idx',
  })
}

export async function down(queryInterface) {
  await queryInterface.removeIndex('entity_list_preferences', 'entity_list_preferences_user_idx').catch(() => {})
  await queryInterface.removeConstraint(
    'entity_list_preferences',
    'entity_list_preferences_unique_scope',
  ).catch(() => {})
  await queryInterface.dropTable('entity_list_preferences').catch(() => {})
}
