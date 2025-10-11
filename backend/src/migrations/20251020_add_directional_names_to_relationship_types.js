export async function up(queryInterface, Sequelize) {
  await queryInterface.addColumn('entity_relationship_types', 'from_name', {
    type: Sequelize.STRING(150),
    allowNull: true,
  })

  await queryInterface.addColumn('entity_relationship_types', 'to_name', {
    type: Sequelize.STRING(150),
    allowNull: true,
  })

  await queryInterface.sequelize.query(`
    UPDATE entity_relationship_types
    SET from_name = COALESCE(NULLIF(TRIM(from_name), ''), name),
        to_name = COALESCE(NULLIF(TRIM(to_name), ''), name)
  `)

  await queryInterface.changeColumn('entity_relationship_types', 'from_name', {
    type: Sequelize.STRING(150),
    allowNull: false,
  })

  await queryInterface.changeColumn('entity_relationship_types', 'to_name', {
    type: Sequelize.STRING(150),
    allowNull: false,
  })
}

export async function down(queryInterface) {
  await queryInterface.removeColumn('entity_relationship_types', 'to_name')
  await queryInterface.removeColumn('entity_relationship_types', 'from_name')
}
