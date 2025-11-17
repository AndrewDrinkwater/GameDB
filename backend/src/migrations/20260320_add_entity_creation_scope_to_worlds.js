const TABLE_NAME = 'Worlds'
const COLUMN_NAME = 'entity_creation_scope'
const ENUM_NAME = 'enum_Worlds_entity_creation_scope'

const SCOPE_VALUES = ['owner_dm', 'all_players']

export async function up(queryInterface, Sequelize) {
  const transaction = await queryInterface.sequelize.transaction()

  try {
    // Create ENUM if missing
    await queryInterface.sequelize.query(
      `DO $$ BEGIN
         IF NOT EXISTS (
          SELECT 1 FROM pg_type WHERE typname = '${ENUM_NAME}'
         ) THEN
            CREATE TYPE "${ENUM_NAME}" AS ENUM ('owner_dm', 'all_players');
         END IF;
       END $$;`,
      { transaction }
    )

    // Check for column
    const table = await queryInterface.describeTable(TABLE_NAME)
    if (!table[COLUMN_NAME]) {
      await queryInterface.addColumn(
        TABLE_NAME,
        COLUMN_NAME,
        {
          type: Sequelize.ENUM(...SCOPE_VALUES),
          allowNull: false,
          defaultValue: 'owner_dm'
        },
        { transaction }
      )
    }

    await transaction.commit()
  } catch (err) {
    await transaction.rollback()
    throw err
  }
}

export async function down(queryInterface) {
  const transaction = await queryInterface.sequelize.transaction()

  try {
    const table = await queryInterface.describeTable(TABLE_NAME)
    if (table[COLUMN_NAME]) {
      await queryInterface.removeColumn(TABLE_NAME, COLUMN_NAME, { transaction })
    }

    await queryInterface.sequelize.query(
      `DROP TYPE IF EXISTS "${ENUM_NAME}"`,
      { transaction }
    )

    await transaction.commit()
  } catch (err) {
    await transaction.rollback()
    throw err
  }
}
