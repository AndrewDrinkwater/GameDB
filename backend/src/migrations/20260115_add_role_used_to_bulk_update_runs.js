export async function up(queryInterface, Sequelize) {
  // create enum
  await queryInterface.sequelize.query(
    `DO $$ BEGIN
       CREATE TYPE "enum_bulk_update_runs_role_used" AS ENUM ('owner','dm');
     EXCEPTION WHEN duplicate_object THEN null;
     END $$;`
  )

  // check column
  const [result] = await queryInterface.sequelize.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_name = 'bulk_update_runs'
       AND column_name = 'role_used';`
  )

  if (result.length > 0) return

  // add column
  await queryInterface.sequelize.transaction(async (t) => {
    await queryInterface.addColumn(
      'bulk_update_runs',
      'role_used',
      {
        type: Sequelize.ENUM('owner', 'dm'),
        allowNull: false,
        defaultValue: 'owner',
      },
      { transaction: t }
    )
  })
}

export async function down(queryInterface, Sequelize) {
  const [result] = await queryInterface.sequelize.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_name = 'bulk_update_runs'
       AND column_name = 'role_used';`
  )

  if (result.length > 0) {
    await queryInterface.removeColumn(
      'bulk_update_runs',
      'role_used'
    )
  }

  await queryInterface.sequelize.query(
    `DROP TYPE IF EXISTS "enum_bulk_update_runs_role_used";`
  )
}
