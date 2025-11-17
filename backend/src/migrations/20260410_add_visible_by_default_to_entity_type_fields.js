export async function up(queryInterface, Sequelize) {
  await queryInterface.addColumn('entity_type_fields', 'visible_by_default', {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  })
}

export async function down(queryInterface) {
  await queryInterface.removeColumn('entity_type_fields', 'visible_by_default')
}
