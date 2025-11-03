// src/migrations/20251107_add_entity_access_controls.js
export async function up(queryInterface, Sequelize) {
  // Ensure enums exist before adding columns
  await queryInterface.sequelize.query(`
    DO $$
    BEGIN
      CREATE TYPE "public"."enum_entities_read_access" AS ENUM ('global', 'selective', 'hidden');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await queryInterface.sequelize.query(`
    DO $$
    BEGIN
      CREATE TYPE "public"."enum_entities_write_access" AS ENUM ('global', 'selective', 'hidden');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `);

  // Helper function to conditionally add a column
  const addColumnIfNotExists = async (table, column, definitionSql) => {
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = '${table}'
            AND column_name = '${column}'
        ) THEN
          ALTER TABLE "${table}" ADD COLUMN ${definitionSql};
        END IF;
      END $$;
    `);
  };

  // Add all columns conditionally
  await addColumnIfNotExists(
    'entities',
    'read_access',
    `"read_access" "public"."enum_entities_read_access" NOT NULL DEFAULT 'global'`
  );

  await addColumnIfNotExists(
    'entities',
    'write_access',
    `"write_access" "public"."enum_entities_write_access" NOT NULL DEFAULT 'global'`
  );

  await addColumnIfNotExists(
    'entities',
    'read_campaign_ids',
    `"read_campaign_ids" uuid[] NOT NULL DEFAULT ARRAY[]::uuid[]`
  );

  await addColumnIfNotExists(
    'entities',
    'read_user_ids',
    `"read_user_ids" uuid[] NOT NULL DEFAULT ARRAY[]::uuid[]`
  );

  await addColumnIfNotExists(
    'entities',
    'write_campaign_ids',
    `"write_campaign_ids" uuid[] NOT NULL DEFAULT ARRAY[]::uuid[]`
  );

  await addColumnIfNotExists(
    'entities',
    'write_user_ids',
    `"write_user_ids" uuid[] NOT NULL DEFAULT ARRAY[]::uuid[]`
  );
}

export async function down(queryInterface) {
  const dropColumnIfExists = async (table, column) => {
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = '${table}'
            AND column_name = '${column}'
        ) THEN
          ALTER TABLE "${table}" DROP COLUMN "${column}";
        END IF;
      END $$;
    `);
  };

  // Drop all columns if they exist
  await dropColumnIfExists('entities', 'write_user_ids');
  await dropColumnIfExists('entities', 'write_campaign_ids');
  await dropColumnIfExists('entities', 'read_user_ids');
  await dropColumnIfExists('entities', 'read_campaign_ids');
  await dropColumnIfExists('entities', 'write_access');
  await dropColumnIfExists('entities', 'read_access');

  // Drop enum types if present
  await queryInterface.sequelize.query(`
    DO $$
    BEGIN
      DROP TYPE IF EXISTS "public"."enum_entities_read_access";
      DROP TYPE IF EXISTS "public"."enum_entities_write_access";
    END $$;
  `);
}
