'use strict'

export async function up(queryInterface, Sequelize) {
  // Drop genre if it exists
  const tableDesc = await queryInterface.describeTable('Worlds')

  if (tableDesc.genre) {
    await queryInterface.removeColumn('Worlds', 'genre')
  }

  // Add system column if missing
  if (!tableDesc.system) {
    await queryInterface.addColumn('Worlds', 'system', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Game system or ruleset (e.g., D&D 5e, Pathfinder)',
    })
  }

  // Add status column if missing
  if (!tableDesc.status) {
    await queryInterface.addColumn('Worlds', 'status', {
      type: Sequelize.ENUM('active', 'archived'),
      allowNull: false,
      defaultValue: 'active',
    })
  }
}

export async function down(queryInterface, Sequelize) {
  // Revert columns
  const tableDesc = await queryInterface.describeTable('Worlds')

  if (tableDesc.system) {
    await queryInterface.removeColumn('Worlds', 'system')
  }

  if (tableDesc.status) {
    await queryInterface.removeColumn('Worlds', 'status')
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Worlds_status";')
  }

  // (Optional) restore genre if you want reversibility
  if (!tableDesc.genre) {
    await queryInterface.addColumn('Worlds', 'genre', {
      type: Sequelize.STRING,
      allowNull: true,
    })
  }
}
