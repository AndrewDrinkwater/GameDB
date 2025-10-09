// src/migrations/20251009_create_campaigns.js
export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('Campaigns', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
      primaryKey: true,
    },
    world_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'Worlds', key: 'id' },
      onDelete: 'CASCADE',
    },
    name: { type: Sequelize.STRING, allowNull: false },
    description: { type: Sequelize.TEXT },
    status: {
      type: Sequelize.ENUM('draft', 'active', 'archived'),
      defaultValue: 'draft',
    },
    createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
    updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
  })
}

export async function down(queryInterface) {
  await queryInterface.dropTable('Campaigns')
}
