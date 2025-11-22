// src/migrations/20250125_allow_reference_type_id_to_reference_entity_types.js
export async function up(queryInterface) {
  // Drop the existing foreign key constraint on reference_type_id
  // This allows reference_type_id to reference either entity_types or location_types
  // depending on the data_type of the field
  await queryInterface.sequelize.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'location_type_fields_reference_type_id_fkey'
      ) THEN
        ALTER TABLE "location_type_fields"
        DROP CONSTRAINT "location_type_fields_reference_type_id_fkey";
      END IF;
    END $$;
  `)
}

export async function down(queryInterface) {
  // Restore the foreign key constraint to location_types only
  // Note: This will fail if there are any existing entity_reference fields
  await queryInterface.sequelize.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'location_type_fields_reference_type_id_fkey'
      ) THEN
        ALTER TABLE "location_type_fields"
        ADD CONSTRAINT "location_type_fields_reference_type_id_fkey"
        FOREIGN KEY ("reference_type_id")
        REFERENCES "location_types" ("id")
        ON UPDATE CASCADE
        ON DELETE SET NULL;
      END IF;
    END $$;
  `)
}

