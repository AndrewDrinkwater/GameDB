export async function up(queryInterface, Sequelize) {
  // Safely add world_id column only if it doesn't exist
  await queryInterface.sequelize.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'entity_relationship_types'
          AND column_name = 'world_id'
      ) THEN
        ALTER TABLE "public"."entity_relationship_types"
        ADD COLUMN "world_id" UUID REFERENCES "Worlds" ("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
    END;
    $$;
  `);

  await queryInterface.addIndex('entity_relationship_types', ['world_id'], {
    name: 'idx_relationship_types_world',
  });

  // Drop old unique constraint safely if it exists
  await queryInterface.sequelize.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'entity_relationship_types_name_key'
      ) THEN
        ALTER TABLE "entity_relationship_types"
        DROP CONSTRAINT "entity_relationship_types_name_key";
      END IF;
    END;
    $$;
  `);

  // Add new unique constraint (world_id + name)
  await queryInterface.addConstraint('entity_relationship_types', {
    type: 'unique',
    fields: ['world_id', 'name'],
    name: 'uniq_relationship_types_world_name',
  });

  // Create linking table between relationship types and entity types
  await queryInterface.createTable('entity_relationship_type_entity_types', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
      primaryKey: true,
    },
    relationship_type_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'entity_relationship_types', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    entity_type_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'entity_types', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    role: {
      type: Sequelize.ENUM('from', 'to'),
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

  await queryInterface.addConstraint('entity_relationship_type_entity_types', {
    type: 'unique',
    fields: ['relationship_type_id', 'entity_type_id', 'role'],
    name: 'uniq_relationship_type_entity_type_role',
  });
}

export async function down(queryInterface) {
  await queryInterface.removeConstraint(
    'entity_relationship_type_entity_types',
    'uniq_relationship_type_entity_type_role'
  );
  await queryInterface.dropTable('entity_relationship_type_entity_types');

  await queryInterface.removeConstraint(
    'entity_relationship_types',
    'uniq_relationship_types_world_name'
  );

  await queryInterface.addConstraint('entity_relationship_types', {
    type: 'unique',
    fields: ['name'],
    name: 'entity_relationship_types_name_key',
  });

  await queryInterface.removeIndex('entity_relationship_types', 'idx_relationship_types_world');

  // Drop column safely if it exists
  await queryInterface.sequelize.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'entity_relationship_types'
          AND column_name = 'world_id'
      ) THEN
        ALTER TABLE "entity_relationship_types" DROP COLUMN "world_id";
      END IF;
    END;
    $$;
  `);

  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_entity_relationship_type_entity_types_role";'
  );
}
