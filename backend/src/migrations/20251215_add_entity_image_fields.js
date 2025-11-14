// src/migrations/20251215_add_entity_image_fields.js
export async function up(queryInterface, Sequelize) {
  await queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.addColumn(
      'entities',
      'image_data',
      {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: null,
      },
      { transaction }
    )

    await queryInterface.addColumn(
      'entities',
      'image_mime_type',
      {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: null,
      },
      { transaction }
    )
  })
}

export async function down(queryInterface) {
  await queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.removeColumn('entities', 'image_data', { transaction })
    await queryInterface.removeColumn('entities', 'image_mime_type', { transaction })
  })
}
