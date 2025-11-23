// 20250120_split_reference_into_entity_and_location.js

export async function up(queryInterface) {
  // 1. Add enum values OUTSIDE any transaction
  // Postgres forbids adding enum + using enum in same transaction
  await queryInterface.sequelize.query(
    `ALTER TYPE enum_entity_type_fields_data_type 
       ADD VALUE IF NOT EXISTS 'entity_reference'`
  );

  await queryInterface.sequelize.query(
    `ALTER TYPE enum_entity_type_fields_data_type 
       ADD VALUE IF NOT EXISTS 'location_reference'`
  );

  await queryInterface.sequelize.query(
    `ALTER TYPE enum_location_type_fields_data_type 
       ADD VALUE IF NOT EXISTS 'entity_reference'`
  );

  await queryInterface.sequelize.query(
    `ALTER TYPE enum_location_type_fields_data_type 
       ADD VALUE IF NOT EXISTS 'location_reference'`
  );

  // 2. Now safely run the UPDATEs inside a transaction
  await queryInterface.sequelize.transaction(async (transaction) => {
    // Entity type fields: reference → entity_reference
    await queryInterface.sequelize.query(
      `UPDATE "entity_type_fields"
         SET "data_type" = 'entity_reference'
       WHERE "data_type" = 'reference'`,
      { transaction }
    );

    // Location type fields: reference → location_reference
    await queryInterface.sequelize.query(
      `UPDATE "location_type_fields"
         SET "data_type" = 'location_reference'
       WHERE "data_type" = 'reference'`,
      { transaction }
    );
  });
}

export async function down(queryInterface) {
  // Down only needs to reverse data changes
  // Removing enum values is not supported in PostgreSQL

  await queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.sequelize.query(
      `UPDATE "entity_type_fields"
         SET "data_type" = 'reference'
       WHERE "data_type" IN ('entity_reference', 'location_reference')`,
      { transaction }
    );

    await queryInterface.sequelize.query(
      `UPDATE "location_type_fields"
         SET "data_type" = 'reference'
       WHERE "data_type" IN ('entity_reference', 'location_reference')`,
      { transaction }
    );
  });
}
