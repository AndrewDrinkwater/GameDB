const BULK_UPDATE_RUN_INDEXES = [
  { name: 'bulk_update_runs_world_id', column: 'world_id' },
  { name: 'bulk_update_runs_user_id', column: 'user_id' },
]

const BULK_UPDATE_CHANGE_INDEXES = [
  { name: 'bulk_update_changes_run_id', column: 'run_id' },
  { name: 'bulk_update_changes_entity_id', column: 'entity_id' },
]

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
      references: { model: 'Worlds', key: 'id' },
      onDelete: 'CASCADE',
    },
    user_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'Users', key: 'id' },
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

  for (const { name, column } of BULK_UPDATE_RUN_INDEXES) {
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS "${name}"
      ON "bulk_update_runs" ("${column}")
    `)
  }

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

  for (const { name, column } of BULK_UPDATE_CHANGE_INDEXES) {
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS "${name}"
      ON "bulk_update_changes" ("${column}")
    `)
  }
}

export async function down(queryInterface) {
  await queryInterface.dropTable('bulk_update_changes')
  await queryInterface.dropTable('bulk_update_runs')
}
