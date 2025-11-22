// src/migrations/20250124_add_focus_to_location_types.js
export async function up(queryInterface, Sequelize) {
  await queryInterface.addColumn('location_types', 'focus', {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
}

export async function down(queryInterface) {
  await queryInterface.removeColumn('location_types', 'focus')
}

