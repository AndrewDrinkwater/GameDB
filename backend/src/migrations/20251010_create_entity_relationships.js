// src/migrations/20251011_create_entity_relationships.js
export async function up(queryInterface, Sequelize) {
  // 1. Relationship Types Table
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
  });

  // 2. Relationships Table
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
  });

  // 3. Safe Index Creation
  await queryInterface.sequelize.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'idx_entity_relationships_from' AND n.nspname = 'public'
      ) THEN
        CREATE INDEX idx_entity_relationships_from ON "entity_relationships" ("from_entity");
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'idx_entity_relationships_to' AND n.nspname = 'public'
      ) THEN
        CREATE INDEX idx_entity_relationships_to ON "entity_relationships" ("to_entity");
      END IF;
    END;
    $$;
  `);
}

export async function down(queryInterface) {
  // Safe removal in order
  await queryInterface.removeIndex('entity_relationships', 'idx_entity_relationships_to').catch(() => {});
  await queryInterface.removeIndex('entity_relationships', 'idx_entity_relationships_from').catch(() => {});
  await queryInterface.dropTable('entity_relationships').catch(() => {});
  await queryInterface.dropTable('entity_relationship_types').catch(() => {});
}
