export async function up(queryInterface, Sequelize) {
  await queryInterface.addColumn('entity_relationship_types', 'world_id', {
    type: Sequelize.UUID,
    allowNull: true,
    references: { model: 'Worlds', key: 'id' },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  })

  await queryInterface.addIndex('entity_relationship_types', ['world_id'], {
    name: 'idx_relationship_types_world',
  })

  await queryInterface.removeConstraint(
    'entity_relationship_types',
    'entity_relationship_types_name_key',
  )

  await queryInterface.addConstraint('entity_relationship_types', {
    type: 'unique',
    fields: ['world_id', 'name'],
    name: 'uniq_relationship_types_world_name',
  })

  await queryInterface.createTable('entity_relationship_type_entity_types', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
      primaryKey: true,
    },
    relationship_type_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'entity_relationship_types', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    entity_type_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'entity_types', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    role: {
      type: Sequelize.ENUM('from', 'to'),
      allowNull: false,
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('NOW()'),
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('NOW()'),
    },
  })

  await queryInterface.addConstraint('entity_relationship_type_entity_types', {
    type: 'unique',
    fields: ['relationship_type_id', 'entity_type_id', 'role'],
    name: 'uniq_relationship_type_entity_type_role',
  })
}

export async function down(queryInterface) {
  await queryInterface.removeConstraint(
    'entity_relationship_type_entity_types',
    'uniq_relationship_type_entity_type_role',
  )
  await queryInterface.dropTable('entity_relationship_type_entity_types')

  await queryInterface.removeConstraint(
    'entity_relationship_types',
    'uniq_relationship_types_world_name',
  )
  await queryInterface.addConstraint('entity_relationship_types', {
    type: 'unique',
    fields: ['name'],
    name: 'entity_relationship_types_name_key',
  })

  await queryInterface.removeIndex('entity_relationship_types', 'idx_relationship_types_world')
  await queryInterface.removeColumn('entity_relationship_types', 'world_id')
  await queryInterface.sequelize.query(
    "DROP TYPE IF EXISTS \"enum_entity_relationship_type_entity_types_role\";",
  )
}
