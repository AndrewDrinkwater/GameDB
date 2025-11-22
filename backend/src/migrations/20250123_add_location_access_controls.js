// src/migrations/20250123_add_location_access_controls.js
export async function up(queryInterface, Sequelize) {
  // Ensure enums exist before adding columns (reuse entity enums if they exist)
  await queryInterface.sequelize.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_entities_read_access') THEN
        CREATE TYPE "public"."enum_entities_read_access" AS ENUM ('global', 'selective', 'hidden');
      END IF;
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await queryInterface.sequelize.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_entities_write_access') THEN
        CREATE TYPE "public"."enum_entities_write_access" AS ENUM ('global', 'selective', 'hidden', 'owner_only');
      END IF;
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `);

  // Ensure visibility enum exists (locations might use it later)
  await queryInterface.sequelize.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_entities_visibility') THEN
        CREATE TYPE "public"."enum_entities_visibility" AS ENUM ('hidden', 'visible', 'partial');
      END IF;
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
    'locations',
    'visibility',
    `"visibility" "public"."enum_entities_visibility" NOT NULL DEFAULT 'visible'`,
  );

  await addColumnIfNotExists(
    'locations',
    'read_access',
    `"read_access" "public"."enum_entities_read_access" NOT NULL DEFAULT 'global'`
  );

  await addColumnIfNotExists(
    'locations',
    'write_access',
    `"write_access" "public"."enum_entities_write_access" NOT NULL DEFAULT 'global'`
  );

  await addColumnIfNotExists(
    'locations',
    'read_campaign_ids',
    `"read_campaign_ids" uuid[] NOT NULL DEFAULT ARRAY[]::uuid[]`
  );

  await addColumnIfNotExists(
    'locations',
    'read_user_ids',
    `"read_user_ids" uuid[] NOT NULL DEFAULT ARRAY[]::uuid[]`
  );

  await addColumnIfNotExists(
    'locations',
    'read_character_ids',
    `"read_character_ids" uuid[] NOT NULL DEFAULT ARRAY[]::uuid[]`
  );

  await addColumnIfNotExists(
    'locations',
    'write_campaign_ids',
    `"write_campaign_ids" uuid[] NOT NULL DEFAULT ARRAY[]::uuid[]`
  );

  await addColumnIfNotExists(
    'locations',
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
  await dropColumnIfExists('locations', 'write_user_ids');
  await dropColumnIfExists('locations', 'write_campaign_ids');
  await dropColumnIfExists('locations', 'read_character_ids');
  await dropColumnIfExists('locations', 'read_user_ids');
  await dropColumnIfExists('locations', 'read_campaign_ids');
  await dropColumnIfExists('locations', 'write_access');
  await dropColumnIfExists('locations', 'read_access');
  await dropColumnIfExists('locations', 'visibility');
}

