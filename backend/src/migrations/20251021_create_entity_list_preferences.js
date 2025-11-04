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

  // Safely add the unique constraint only if it doesn't already exist
  await queryInterface.sequelize.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'entity_list_preferences_unique_scope'
      ) THEN
        ALTER TABLE "entity_list_preferences"
        ADD CONSTRAINT "entity_list_preferences_unique_scope"
        UNIQUE ("entity_type_id", "user_id");
      END IF;
    END $$;
  `)

  // Add index on user_id (safe to re-run)
  await queryInterface.addIndex('entity_list_preferences', ['user_id'], {
    name: 'entity_list_preferences_user_idx',
  }).catch(() => {})
}

export async function down(queryInterface) {
  await queryInterface.removeIndex('entity_list_preferences', 'entity_list_preferences_user_idx').catch(() => {})
  await queryInterface.removeConstraint('entity_list_preferences', 'entity_list_preferences_unique_scope').catch(() => {})
  await queryInterface.dropTable('entity_list_preferences').catch(() => {})
}
