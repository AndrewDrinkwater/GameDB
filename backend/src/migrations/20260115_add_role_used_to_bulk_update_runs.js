export async function up(queryInterface, Sequelize) {
  await queryInterface.addColumn('bulk_update_runs', 'role_used', {
    type: Sequelize.ENUM('owner', 'dm'),
    allowNull: false,
    defaultValue: 'owner',
  })
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.removeColumn('bulk_update_runs', 'role_used')
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_bulk_update_runs_role_used"')
}
