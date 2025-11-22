// src/migrations/20250124_add_focus_to_location_types.js
export async function up(queryInterface, Sequelize) {
  // Helper function to conditionally add a column
  await queryInterface.sequelize.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'location_types'
          AND column_name = 'focus'
      ) THEN
        ALTER TABLE "location_types"
        ADD COLUMN "focus" BOOLEAN NOT NULL DEFAULT false;
      END IF;
    END $$;
  `)
}

export async function down(queryInterface) {
  // Helper function to conditionally remove a column
  await queryInterface.sequelize.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'location_types'
          AND column_name = 'focus'
      ) THEN
        ALTER TABLE "location_types"
        DROP COLUMN "focus";
      END IF;
    END $$;
  `)
}

