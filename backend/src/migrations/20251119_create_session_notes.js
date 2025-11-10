export async function up(queryInterface, Sequelize) {
  const tableName = 'session_notes'

  const [tableCheck] = await queryInterface.sequelize.query(
    `SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = '${tableName}'
      ) AS "exists";`,
  )

  const tableExists = Array.isArray(tableCheck) && tableCheck[0]?.exists === true

  if (!tableExists) {
    await queryInterface.createTable(tableName, {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
      },
      campaign_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Campaigns', key: 'id' },
        onDelete: 'CASCADE',
      },
      session_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_DATE"),
      },
      session_title: {
        type: Sequelize.STRING(255),
        allowNull: false,
        defaultValue: 'Session note',
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
        defaultValue: '',
      },
      mentions: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onDelete: 'CASCADE',
      },
      updated_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onDelete: 'SET NULL',
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
  }

  await queryInterface.sequelize.query(
    'CREATE INDEX IF NOT EXISTS "session_notes_campaign_id" ON "session_notes" ("campaign_id");',
  )
  await queryInterface.sequelize.query(
    'CREATE INDEX IF NOT EXISTS "session_notes_session_date" ON "session_notes" ("session_date");',
  )
  await queryInterface.sequelize.query(
    'CREATE INDEX IF NOT EXISTS "session_notes_created_by" ON "session_notes" ("created_by");',
  )
}

export async function down(queryInterface) {
  await queryInterface.sequelize.query('DROP INDEX IF EXISTS "session_notes_created_by";')
  await queryInterface.sequelize.query('DROP INDEX IF EXISTS "session_notes_session_date";')
  await queryInterface.sequelize.query('DROP INDEX IF EXISTS "session_notes_campaign_id";')

  const [tableCheck] = await queryInterface.sequelize.query(
    "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'session_notes') AS \"exists\";",
  )

  const tableExists = Array.isArray(tableCheck) && tableCheck[0]?.exists === true
  if (tableExists) {
    await queryInterface.dropTable('session_notes')
  }
}
