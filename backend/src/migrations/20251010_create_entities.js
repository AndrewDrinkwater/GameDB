// src/migrations/20251010_create_entities.js
export async function up(queryInterface, Sequelize) {
  // 1. entity_types
  await queryInterface.createTable('entity_types', {
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
  });

  // 2. entities
  await queryInterface.createTable('entities', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
      primaryKey: true,
    },
    world_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'Worlds', key: 'id' },
      onDelete: 'CASCADE',
    },
    created_by: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'Users', key: 'id' },
      onDelete: 'CASCADE',
    },
    entity_type_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'entity_types', key: 'id' },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    },
    name: {
      type: Sequelize.STRING(255),
      allowNull: false,
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    metadata: {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: Sequelize.literal("'{}'::jsonb"),
    },
    visibility: {
      type: Sequelize.ENUM('hidden', 'visible', 'partial'),
      allowNull: false,
      defaultValue: 'hidden',
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
  });

  // 3. entity_secrets
  await queryInterface.createTable('entity_secrets', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
      primaryKey: true,
    },
    entity_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'entities', key: 'id' },
      onDelete: 'CASCADE',
    },
    created_by: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'Users', key: 'id' },
      onDelete: 'CASCADE',
    },
    title: {
      type: Sequelize.STRING(100),
      allowNull: true,
    },
    content: {
      type: Sequelize.TEXT,
      allowNull: false,
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
  });

  // 4. Indexes (safe check)
  await queryInterface.sequelize.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'idx_entities_world' AND n.nspname = 'public'
      ) THEN
        CREATE INDEX idx_entities_world ON "entities" ("world_id");
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'idx_entities_type' AND n.nspname = 'public'
      ) THEN
        CREATE INDEX idx_entities_type ON "entities" ("entity_type_id");
      END IF;
    END;
    $$;
  `);
}

export async function down(queryInterface) {
  // Drop safely in correct order
  await queryInterface.removeIndex('entities', 'idx_entities_type').catch(() => {});
  await queryInterface.removeIndex('entities', 'idx_entities_world').catch(() => {});
  await queryInterface.dropTable('entity_secrets').catch(() => {});
  await queryInterface.dropTable('entities').catch(() => {});
  await queryInterface.dropTable('entity_types').catch(() => {});
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_entities_visibility";');
}
