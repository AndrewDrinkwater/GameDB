export async function up(queryInterface, Sequelize) {
  // Create table only if missing
  const table = await queryInterface.sequelize.query(
    `SELECT to_regclass('public.entity_type_field_rules') as exists;`
  )
  const exists = table[0][0].exists !== null

  if (!exists) {
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
      name: { type: Sequelize.STRING(150), allowNull: true },
      match_mode: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'all' },
      priority: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      enabled: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      conditions: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      actions: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
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

  // Safe index: entity_type_id
  await queryInterface.sequelize.query(
    `CREATE INDEX IF NOT EXISTS entity_type_field_rules_entity_type_idx
       ON entity_type_field_rules (entity_type_id);`
  )

  // Safe index: priority
  await queryInterface.sequelize.query(
    `CREATE INDEX IF NOT EXISTS entity_type_field_rules_priority_idx
       ON entity_type_field_rules (priority);`
  )
}

export async function down(queryInterface) {
  await queryInterface.dropTable('entity_type_field_rules')
}
