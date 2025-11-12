export async function up(queryInterface, Sequelize) {
  await queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.sequelize.query(
      "ALTER TYPE enum_entity_type_fields_data_type ADD VALUE IF NOT EXISTS 'reference'",
      { transaction }
    )

    await queryInterface.addColumn(
      'entity_type_fields',
      'reference_type_id',
      {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'entity_types', key: 'id' },
        onDelete: 'SET NULL',
      },
      { transaction }
    )

    await queryInterface.addColumn(
      'entity_type_fields',
      'reference_filter',
      {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
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
