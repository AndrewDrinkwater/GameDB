export async function up(queryInterface, Sequelize) {
  await queryInterface.sequelize.transaction(async (transaction) => {
    // Update entity_type_fields enum
    await queryInterface.sequelize.query(
      "ALTER TYPE enum_entity_type_fields_data_type ADD VALUE IF NOT EXISTS 'entity_reference'",
      { transaction }
    )
    await queryInterface.sequelize.query(
      "ALTER TYPE enum_entity_type_fields_data_type ADD VALUE IF NOT EXISTS 'location_reference'",
      { transaction }
    )

    // Migrate existing 'reference' to 'entity_reference' (since they currently reference entity types)
    await queryInterface.sequelize.query(
      `UPDATE "entity_type_fields" SET "data_type" = 'entity_reference' WHERE "data_type" = 'reference'`,
      { transaction }
    )

    // Update location_type_fields enum
    await queryInterface.sequelize.query(
      "ALTER TYPE enum_location_type_fields_data_type ADD VALUE IF NOT EXISTS 'entity_reference'",
      { transaction }
    )
    await queryInterface.sequelize.query(
      "ALTER TYPE enum_location_type_fields_data_type ADD VALUE IF NOT EXISTS 'location_reference'",
      { transaction }
    )

    // Migrate existing 'reference' to 'location_reference' for location type fields
    // (since location type fields currently reference location types)
    await queryInterface.sequelize.query(
      `UPDATE "location_type_fields" SET "data_type" = 'location_reference' WHERE "data_type" = 'reference'`,
      { transaction }
    )
  })
}

export async function down(queryInterface) {
  await queryInterface.sequelize.transaction(async (transaction) => {
    // Migrate back to 'reference'
    await queryInterface.sequelize.query(
      `UPDATE "entity_type_fields" SET "data_type" = 'reference' WHERE "data_type" IN ('entity_reference', 'location_reference')`,
      { transaction }
    )
    await queryInterface.sequelize.query(
      `UPDATE "location_type_fields" SET "data_type" = 'reference' WHERE "data_type" IN ('entity_reference', 'location_reference')`,
      { transaction }
    )

    // Note: We can't remove ENUM values in PostgreSQL easily, so we'll leave them
    // They won't cause issues and can be cleaned up manually if needed
  })
}

