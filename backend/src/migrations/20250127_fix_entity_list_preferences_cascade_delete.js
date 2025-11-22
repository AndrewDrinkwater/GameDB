// src/migrations/20250127_fix_entity_list_preferences_cascade_delete.js
export async function up(queryInterface, Sequelize) {
  await queryInterface.sequelize.transaction(async (transaction) => {
    // Drop the existing foreign key constraint if it exists
    await queryInterface.sequelize.query(
      `
      DO $$
      DECLARE
        constraint_name text;
      BEGIN
        -- Find the foreign key constraint name for entity_type_id that references entity_types
        SELECT conname INTO constraint_name
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_class f ON c.confrelid = f.oid
        WHERE t.relname = 'entity_list_preferences'
          AND f.relname = 'entity_types'
          AND c.contype = 'f'
          AND array_length(c.conkey, 1) = 1
          AND (
            SELECT attname
            FROM pg_attribute
            WHERE attrelid = c.conrelid
              AND attnum = c.conkey[1]
          ) = 'entity_type_id';

        -- Drop the constraint if it exists
        IF constraint_name IS NOT NULL THEN
          EXECUTE format('ALTER TABLE entity_list_preferences DROP CONSTRAINT IF EXISTS %I', constraint_name);
        END IF;
      END $$;
      `,
      { transaction }
    )

    // Re-add the constraint with CASCADE delete
    await queryInterface.sequelize.query(
      `
      DO $$
      BEGIN
        -- Only add the constraint if it doesn't already exist
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conrelid = 'entity_list_preferences'::regclass
            AND conkey::text LIKE '%entity_type_id%'
            AND confrelid = 'entity_types'::regclass
        ) THEN
          ALTER TABLE entity_list_preferences
          ADD CONSTRAINT entity_list_preferences_entity_type_id_fkey
          FOREIGN KEY (entity_type_id)
          REFERENCES entity_types(id)
          ON DELETE CASCADE
          ON UPDATE CASCADE;
        END IF;
      END $$;
      `,
      { transaction }
    )
  })
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.sequelize.transaction(async (transaction) => {
    // Drop the CASCADE constraint
    await queryInterface.sequelize.query(
      `
      DO $$
      DECLARE
        constraint_name text;
      BEGIN
        -- Find the foreign key constraint name for entity_type_id that references entity_types
        SELECT conname INTO constraint_name
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_class f ON c.confrelid = f.oid
        WHERE t.relname = 'entity_list_preferences'
          AND f.relname = 'entity_types'
          AND c.contype = 'f'
          AND array_length(c.conkey, 1) = 1
          AND (
            SELECT attname
            FROM pg_attribute
            WHERE attrelid = c.conrelid
              AND attnum = c.conkey[1]
          ) = 'entity_type_id';

        -- Drop the constraint if it exists
        IF constraint_name IS NOT NULL THEN
          EXECUTE format('ALTER TABLE entity_list_preferences DROP CONSTRAINT IF EXISTS %I', constraint_name);
        END IF;
      END $$;
      `,
      { transaction }
    )

    // Re-add the constraint without CASCADE (restore original state)
    await queryInterface.sequelize.query(
      `
      DO $$
      BEGIN
        -- Only add the constraint if it doesn't already exist
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conrelid = 'entity_list_preferences'::regclass
            AND conkey::text LIKE '%entity_type_id%'
            AND confrelid = 'entity_types'::regclass
        ) THEN
          ALTER TABLE entity_list_preferences
          ADD CONSTRAINT entity_list_preferences_entity_type_id_fkey
          FOREIGN KEY (entity_type_id)
          REFERENCES entity_types(id);
        END IF;
      END $$;
      `,
      { transaction }
    )
  })
}

