export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('entity_type_fields', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
      primaryKey: true,
    },
    entity_type_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'entity_types', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    name: {
      type: Sequelize.STRING(100),
      allowNull: false,
    },
    label: {
      type: Sequelize.STRING(100),
      allowNull: true,
    },
    data_type: {
      type: Sequelize.ENUM('string', 'number', 'boolean', 'text', 'date', 'enum'),
      allowNull: false,
    },
    options: {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: Sequelize.literal("'{}'::jsonb"),
    },
    required: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    default_value: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    sort_order: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  })

  await queryInterface.addConstraint('entity_type_fields', {
    fields: ['entity_type_id', 'name'],
    type: 'unique',
    name: 'entity_type_fields_unique_name_per_type',
  })
}

export async function down(queryInterface) {
  await queryInterface.removeConstraint(
    'entity_type_fields',
    'entity_type_fields_unique_name_per_type'
  )
  await queryInterface.dropTable('entity_type_fields')
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_entity_type_fields_data_type";'
  )
}
