export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('entity_type_field_rules', {
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
    name: {
      type: Sequelize.STRING(150),
      allowNull: true,
    },
    match_mode: {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: 'all',
    },
    priority: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    enabled: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    conditions: {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    actions: {
      type: Sequelize.JSONB,
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

  await queryInterface.addIndex('entity_type_field_rules', ['entity_type_id'], {
    name: 'entity_type_field_rules_entity_type_idx',
  })

  await queryInterface.addIndex('entity_type_field_rules', ['priority'], {
    name: 'entity_type_field_rules_priority_idx',
  })
}

export async function down(queryInterface) {
  await queryInterface.dropTable('entity_type_field_rules')
}
