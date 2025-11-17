export async function up(queryInterface, Sequelize) {
  // Create table if it does not exist
  const table = await queryInterface.sequelize.query(
    `SELECT to_regclass('public.entity_type_field_layouts') as exists;`
  )

  const exists = table[0][0].exists !== null

  if (!exists) {
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
      section_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      column_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      field_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      priority: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
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

  // Safe add unique constraint
  await queryInterface.sequelize.query(
    `DO $$ BEGIN
       IF NOT EXISTS (
         SELECT 1
         FROM pg_constraint
         WHERE conname = 'entity_type_field_layouts_entity_field_unique'
       ) THEN
         ALTER TABLE entity_type_field_layouts
           ADD CONSTRAINT entity_type_field_layouts_entity_field_unique
           UNIQUE (entity_type_id, entity_type_field_id);
       END IF;
     END $$;`
  )

  // Safe add indexes
  await queryInterface.sequelize.query(
    `CREATE INDEX IF NOT EXISTS entity_type_field_layouts_entity_type_idx
       ON entity_type_field_layouts (entity_type_id);`
  )

  await queryInterface.sequelize.query(
    `CREATE INDEX IF NOT EXISTS entity_type_field_layouts_field_idx
       ON entity_type_field_layouts (entity_type_field_id);`
  )
}

export async function down(queryInterface) {
  await queryInterface.dropTable('entity_type_field_layouts')
}
