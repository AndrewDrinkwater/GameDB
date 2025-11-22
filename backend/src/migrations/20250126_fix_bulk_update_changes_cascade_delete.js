// src/migrations/20250126_fix_bulk_update_changes_cascade_delete.js
export async function up(queryInterface, Sequelize) {
  await queryInterface.sequelize.transaction(async (transaction) => {
    // Drop the existing foreign key constraint if it exists
    await queryInterface.sequelize.query(
      `
      DO $$
      DECLARE
        constraint_name text;
      BEGIN
        -- Find the foreign key constraint name for entity_id that references entities
        SELECT conname INTO constraint_name
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_class f ON c.confrelid = f.oid
        WHERE t.relname = 'bulk_update_changes'
          AND f.relname = 'entities'
          AND c.contype = 'f'
          AND array_length(c.conkey, 1) = 1
          AND (
            SELECT attname
            FROM pg_attribute
            WHERE attrelid = c.conrelid
              AND attnum = c.conkey[1]
          ) = 'entity_id';

        -- Drop the constraint if it exists
        IF constraint_name IS NOT NULL THEN
          EXECUTE format('ALTER TABLE bulk_update_changes DROP CONSTRAINT IF EXISTS %I', constraint_name);
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
          WHERE conrelid = 'bulk_update_changes'::regclass
            AND conkey::text LIKE '%entity_id%'
            AND confrelid = 'entities'::regclass
        ) THEN
          ALTER TABLE bulk_update_changes
          ADD CONSTRAINT bulk_update_changes_entity_id_fkey
          FOREIGN KEY (entity_id)
          REFERENCES entities(id)
          ON DELETE CASCADE;
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
        -- Find the foreign key constraint name for entity_id that references entities
        SELECT conname INTO constraint_name
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_class f ON c.confrelid = f.oid
        WHERE t.relname = 'bulk_update_changes'
          AND f.relname = 'entities'
          AND c.contype = 'f'
          AND array_length(c.conkey, 1) = 1
          AND (
            SELECT attname
            FROM pg_attribute
            WHERE attrelid = c.conrelid
              AND attnum = c.conkey[1]
          ) = 'entity_id';

        -- Drop the constraint if it exists
        IF constraint_name IS NOT NULL THEN
          EXECUTE format('ALTER TABLE bulk_update_changes DROP CONSTRAINT IF EXISTS %I', constraint_name);
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
          WHERE conrelid = 'bulk_update_changes'::regclass
            AND conkey::text LIKE '%entity_id%'
            AND confrelid = 'entities'::regclass
        ) THEN
          ALTER TABLE bulk_update_changes
          ADD CONSTRAINT bulk_update_changes_entity_id_fkey
          FOREIGN KEY (entity_id)
          REFERENCES entities(id);
        END IF;
      END $$;
      `,
      { transaction }
    )
  })
}

