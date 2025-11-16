export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('entity_type_field_layouts', {
    id: {
      type: Sequelize.UUID,
      primaryKey: true,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
    },
    entity_type_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'entity_types', key: 'id' },
      onDelete: 'CASCADE',
    },
    entity_type_field_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'entity_type_fields', key: 'id' },
      onDelete: 'CASCADE',
    },
    section_order: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    column_order: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    field_order: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    priority: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
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

  await queryInterface.addConstraint('entity_type_field_layouts', {
    fields: ['entity_type_id', 'entity_type_field_id'],
    type: 'unique',
    name: 'entity_type_field_layouts_entity_field_unique',
  })

  await queryInterface.addIndex('entity_type_field_layouts', ['entity_type_id'], {
    name: 'entity_type_field_layouts_entity_type_idx',
  })

  await queryInterface.addIndex('entity_type_field_layouts', ['entity_type_field_id'], {
    name: 'entity_type_field_layouts_field_idx',
  })
}

export async function down(queryInterface) {
  await queryInterface.dropTable('entity_type_field_layouts')
}
