export async function up(queryInterface, Sequelize) {
  const table = 'entity_type_fields'
  const col = 'visible_by_default'

  const cols = await queryInterface.describeTable(table)

  if (!cols[col]) {
    await queryInterface.addColumn(table, col, {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    })
  }
}

export async function down(queryInterface) {
  const table = 'entity_type_fields'
  const col = 'visible_by_default'

  const cols = await queryInterface.describeTable(table)

  if (cols[col]) {
    await queryInterface.removeColumn(table, col)
  }
}
