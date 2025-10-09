// src/migrations/20251012_add_created_by_to_campaigns.js
export async function up(queryInterface, Sequelize) {
  const tableDesc = await queryInterface.describeTable('Campaigns')

  if (!tableDesc.created_by) {
    await queryInterface.addColumn('Campaigns', 'created_by', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'Users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    })
  }
}

export async function down(queryInterface) {
  const tableDesc = await queryInterface.describeTable('Campaigns')

  if (tableDesc.created_by) {
    await queryInterface.removeColumn('Campaigns', 'created_by')
  }
}
