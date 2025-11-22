export async function up(queryInterface, Sequelize) {
  await queryInterface.sequelize.transaction(async (transaction) => {
    // Drop the foreign key constraint on reference_type_id if it exists
    // This allows reference_type_id to reference both entity_types (for entity_reference)
    // and location_types (for location_reference), or be null (for location_reference without type restriction)
    // 
    // The constraint validation will be handled in the application layer instead
    await queryInterface.sequelize.query(
      `
      DO $$
      DECLARE
        constraint_name text;
      BEGIN
        -- Find the foreign key constraint name for reference_type_id that references entity_types
        SELECT conname INTO constraint_name
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_class f ON c.confrelid = f.oid
        WHERE t.relname = 'entity_type_fields'
          AND f.relname = 'entity_types'
          AND c.contype = 'f'
          AND array_length(c.conkey, 1) = 1
          AND (
            SELECT attname 
            FROM pg_attribute 
            WHERE attrelid = c.conrelid 
              AND attnum = c.conkey[1]
          ) = 'reference_type_id';
        
        -- Drop the constraint if it exists
        IF constraint_name IS NOT NULL THEN
          EXECUTE format('ALTER TABLE entity_type_fields DROP CONSTRAINT IF EXISTS %I', constraint_name);
        END IF;
      END $$;
      `,
      { transaction }
    )
  })
}

export async function down(queryInterface) {
  // Re-add the foreign key constraint in the down migration if needed
  // Note: This will only reference entity_types, which was the original behavior
  await queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.sequelize.query(
      `
      DO $$
      BEGIN
        -- Only add the constraint if it doesn't already exist
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conrelid = 'entity_type_fields'::regclass
            AND conkey::text LIKE '%reference_type_id%'
            AND confrelid = 'entity_types'::regclass
        ) THEN
          ALTER TABLE entity_type_fields
          ADD CONSTRAINT entity_type_fields_reference_type_id_fkey
          FOREIGN KEY (reference_type_id) 
          REFERENCES entity_types(id) 
          ON DELETE SET NULL;
        END IF;
      END $$;
      `,
      { transaction }
    )
  })
}

