const TABLE_NAME = 'entity_collections'
const WORLD_INDEX = 'idx_entity_collections_world_id'
const OWNER_INDEX = 'idx_entity_collections_owner_id'

export async function up(queryInterface, Sequelize) {
  const transaction = await queryInterface.sequelize.transaction()
  try {
    await queryInterface.createTable(
      TABLE_NAME,
      {
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
        owner_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'Users', key: 'id' },
          onDelete: 'CASCADE',
        },
        name: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        shared: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        selection_mode: {
          type: Sequelize.TEXT,
          allowNull: false,
          defaultValue: 'manual',
        },
        criteria: {
          type: Sequelize.JSONB,
          allowNull: true,
        },
        entity_ids: {
          type: Sequelize.ARRAY(Sequelize.UUID),
          allowNull: false,
          defaultValue: Sequelize.literal('ARRAY[]::UUID[]'),
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
      },
      { transaction },
    )

    await queryInterface.sequelize.query(
      `CREATE INDEX IF NOT EXISTS "${WORLD_INDEX}" ON "${TABLE_NAME}" ("world_id")`,
      { transaction },
    )
    await queryInterface.sequelize.query(
      `CREATE INDEX IF NOT EXISTS "${OWNER_INDEX}" ON "${TABLE_NAME}" ("owner_id")`,
      { transaction },
    )

    await transaction.commit()
  } catch (error) {
    await transaction.rollback()
    throw error
  }
}

export async function down(queryInterface) {
  await queryInterface.dropTable(TABLE_NAME)
}
