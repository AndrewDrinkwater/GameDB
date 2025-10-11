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
      // Added reference type support
      type: Sequelize.ENUM(
        'string',
        'number',
        'boolean',
        'text',
        'date',
        'enum',
        'reference'
      ),
      allowNull: false,
    },
    options: {
      // for enum choices or UI hints
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
    // reference-type extension fields
    reference_type_id: {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'entity_types', key: 'id' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    },
    reference_filter: {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: Sequelize.literal("'{}'::jsonb"),
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
  });

  // Safe constraint creation (prevents duplicate failure)
  await queryInterface.sequelize.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'entity_type_fields_unique_name_per_type'
      ) THEN
        ALTER TABLE "entity_type_fields"
        ADD CONSTRAINT "entity_type_fields_unique_name_per_type"
        UNIQUE ("entity_type_id", "name");
      END IF;
    END;
    $$;
  `);
}

export async function down(queryInterface) {
  await queryInterface.removeConstraint(
    'entity_type_fields',
    'entity_type_fields_unique_name_per_type'
  );
  await queryInterface.dropTable('entity_type_fields');
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_entity_type_fields_data_type";'
  );
}
