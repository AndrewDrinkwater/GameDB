const TABLE_NAME = 'Worlds'
const COLUMN_NAME = 'entity_creation_scope'
const ENUM_NAME = 'enum_Worlds_entity_creation_scope'

const SCOPE_VALUES = ['owner_dm', 'all_players']

export async function up(queryInterface, Sequelize) {
  const transaction = await queryInterface.sequelize.transaction()
  try {
    await queryInterface.addColumn(
      TABLE_NAME,
      COLUMN_NAME,
      {
        type: Sequelize.ENUM(...SCOPE_VALUES),
        allowNull: false,
        defaultValue: 'owner_dm',
      },
      { transaction },
    )

    await transaction.commit()
  } catch (error) {
    await transaction.rollback()
    throw error
  }
}

export async function down(queryInterface) {
  const transaction = await queryInterface.sequelize.transaction()
  try {
    await queryInterface.removeColumn(TABLE_NAME, COLUMN_NAME, { transaction })
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "${ENUM_NAME}"`, { transaction })
    await transaction.commit()
  } catch (error) {
    await transaction.rollback()
    throw error
  }
}
