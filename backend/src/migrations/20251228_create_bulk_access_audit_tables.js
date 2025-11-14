export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('bulk_update_runs', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.literal('uuid_generate_v4()'),
      primaryKey: true,
    },
    world_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'worlds', key: 'id' },
      onDelete: 'CASCADE',
    },
    user_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    campaign_context_id: {
      type: Sequelize.UUID,
      allowNull: true,
    },
    description: {
      type: Sequelize.STRING(500),
      allowNull: true,
    },
    entity_count: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    reverted: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    created_at: {
      allowNull: false,
      type: Sequelize.DATE,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
    updated_at: {
      allowNull: false,
      type: Sequelize.DATE,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
  })

  await queryInterface.addIndex('bulk_update_runs', ['world_id'])
  await queryInterface.addIndex('bulk_update_runs', ['user_id'])

  await queryInterface.createTable('bulk_update_changes', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.literal('uuid_generate_v4()'),
      primaryKey: true,
    },
    run_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'bulk_update_runs', key: 'id' },
      onDelete: 'CASCADE',
    },
    entity_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'entities', key: 'id' },
      onDelete: 'CASCADE',
    },
    old_read_access: {
      type: Sequelize.ENUM('global', 'selective', 'hidden'),
      allowNull: false,
    },
    old_write_access: {
      type: Sequelize.ENUM('global', 'selective', 'hidden', 'owner_only'),
      allowNull: false,
    },
    old_read_campaign_ids: {
      type: Sequelize.ARRAY(Sequelize.UUID),
      allowNull: false,
      defaultValue: [],
    },
    old_read_user_ids: {
      type: Sequelize.ARRAY(Sequelize.UUID),
      allowNull: false,
      defaultValue: [],
    },
    old_read_character_ids: {
      type: Sequelize.ARRAY(Sequelize.UUID),
      allowNull: false,
      defaultValue: [],
    },
    old_write_campaign_ids: {
      type: Sequelize.ARRAY(Sequelize.UUID),
      allowNull: false,
      defaultValue: [],
    },
    old_write_user_ids: {
      type: Sequelize.ARRAY(Sequelize.UUID),
      allowNull: false,
      defaultValue: [],
    },
    created_at: {
      allowNull: false,
      type: Sequelize.DATE,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
    updated_at: {
      allowNull: false,
      type: Sequelize.DATE,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
  })

  await queryInterface.addIndex('bulk_update_changes', ['run_id'])
  await queryInterface.addIndex('bulk_update_changes', ['entity_id'])
}

export async function down(queryInterface) {
  await queryInterface.dropTable('bulk_update_changes')
  await queryInterface.dropTable('bulk_update_runs')
}
