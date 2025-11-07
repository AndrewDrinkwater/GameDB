// src/migrations/20251110_extend_entity_secret_permissions.js

export async function up(queryInterface, Sequelize) {
  await queryInterface.changeColumn('entity_secret_permissions', 'user_id', {
    type: Sequelize.UUID,
    allowNull: true,
  })

  await queryInterface.addColumn('entity_secret_permissions', 'campaign_id', {
    type: Sequelize.UUID,
    allowNull: true,
    references: { model: 'campaigns', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  })

  await queryInterface.sequelize.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS entity_secret_permissions_unique_secret_campaign
    ON entity_secret_permissions (secret_id, campaign_id)
    WHERE campaign_id IS NOT NULL;
  `)
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.sequelize.query(`
    DROP INDEX IF EXISTS entity_secret_permissions_unique_secret_campaign;
  `)

  await queryInterface.removeColumn('entity_secret_permissions', 'campaign_id')

  await queryInterface.changeColumn('entity_secret_permissions', 'user_id', {
    type: Sequelize.UUID,
    allowNull: false,
  })
}
