export async function up(queryInterface, Sequelize) {
  await queryInterface.sequelize.transaction(async (transaction) => {
    // Add enum value if missing
    await queryInterface.sequelize.query(
      "ALTER TYPE enum_entity_type_fields_data_type ADD VALUE IF NOT EXISTS 'reference'",
      { transaction }
    )

    // Add reference_type_id if not exists
    await queryInterface.sequelize.query(
      `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'entity_type_fields'
          AND column_name = 'reference_type_id'
        ) THEN
          ALTER TABLE "entity_type_fields"
          ADD COLUMN "reference_type_id" UUID REFERENCES "entity_types" ("id") ON DELETE SET NULL;
        END IF;
      END $$;
      `,
      { transaction }
    )

    // Add reference_filter if not exists
    await queryInterface.sequelize.query(
      `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'entity_type_fields'
          AND column_name = 'reference_filter'
        ) THEN
          ALTER TABLE "entity_type_fields"
          ADD COLUMN "reference_filter" JSONB NOT NULL DEFAULT '{}'::jsonb;
        END IF;
      END $$;
      `,
      { transaction }
    )
  })
}

export async function down(queryInterface) {
  await queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.removeColumn('entity_type_fields', 'reference_filter', { transaction })
    await queryInterface.removeColumn('entity_type_fields', 'reference_type_id', { transaction })

    await queryInterface.sequelize.query(
      "CREATE TYPE enum_entity_type_fields_data_type_old AS ENUM ('string', 'number', 'boolean', 'text', 'date', 'enum')",
      { transaction }
    )

    await queryInterface.sequelize.query(
      'ALTER TABLE "entity_type_fields" ALTER COLUMN "data_type" TYPE enum_entity_type_fields_data_type_old USING "data_type"::text::enum_entity_type_fields_data_type_old',
      { transaction }
    )

    await queryInterface.sequelize.query('DROP TYPE enum_entity_type_fields_data_type', { transaction })
    await queryInterface.sequelize.query(
      'ALTER TYPE enum_entity_type_fields_data_type_old RENAME TO enum_entity_type_fields_data_type',
      { transaction }
    )
  })
}
