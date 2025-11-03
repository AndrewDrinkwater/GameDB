// src/migrations/20251107_add_entity_access_controls.js
export async function up(queryInterface, Sequelize) {
  await queryInterface.addColumn('entities', 'read_access', {
    type: Sequelize.ENUM('global', 'selective', 'hidden'),
    allowNull: false,
    defaultValue: 'global',
  })

  await queryInterface.addColumn('entities', 'write_access', {
    type: Sequelize.ENUM('global', 'selective', 'hidden'),
    allowNull: false,
    defaultValue: 'global',
  })

  await queryInterface.addColumn('entities', 'read_campaign_ids', {
    type: Sequelize.ARRAY(Sequelize.UUID),
    allowNull: false,
    defaultValue: Sequelize.literal('ARRAY[]::uuid[]'),
  })

  await queryInterface.addColumn('entities', 'read_user_ids', {
    type: Sequelize.ARRAY(Sequelize.UUID),
    allowNull: false,
    defaultValue: Sequelize.literal('ARRAY[]::uuid[]'),
  })

  await queryInterface.addColumn('entities', 'write_campaign_ids', {
    type: Sequelize.ARRAY(Sequelize.UUID),
    allowNull: false,
    defaultValue: Sequelize.literal('ARRAY[]::uuid[]'),
  })

  await queryInterface.addColumn('entities', 'write_user_ids', {
    type: Sequelize.ARRAY(Sequelize.UUID),
    allowNull: false,
    defaultValue: Sequelize.literal('ARRAY[]::uuid[]'),
  })
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.removeColumn('entities', 'write_user_ids').catch(() => {})
  await queryInterface.removeColumn('entities', 'write_campaign_ids').catch(() => {})
  await queryInterface.removeColumn('entities', 'read_user_ids').catch(() => {})
  await queryInterface.removeColumn('entities', 'read_campaign_ids').catch(() => {})
  await queryInterface.removeColumn('entities', 'write_access').catch(() => {})
  await queryInterface.removeColumn('entities', 'read_access').catch(() => {})

  await queryInterface.sequelize
    .query('DROP TYPE IF EXISTS "enum_entities_read_access"')
    .catch(() => {})
  await queryInterface.sequelize
    .query('DROP TYPE IF EXISTS "enum_entities_write_access"')
    .catch(() => {})
}
