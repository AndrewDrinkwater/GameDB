export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('entity_secret_permissions', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
      primaryKey: true,
    },
    secret_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'entity_secrets', key: 'id' },
      onDelete: 'CASCADE',
    },
    user_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'Users', key: 'id' },
      onDelete: 'CASCADE',
    },
    can_view: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
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

  // Safe constraint creation
  await queryInterface.sequelize.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'entity_secret_permissions_unique_secret_user'
      ) THEN
        ALTER TABLE "entity_secret_permissions"
        ADD CONSTRAINT "entity_secret_permissions_unique_secret_user"
        UNIQUE ("secret_id", "user_id");
      END IF;
    END;
    $$;
  `);
}

export async function down(queryInterface) {
  await queryInterface.sequelize.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'entity_secret_permissions_unique_secret_user'
      ) THEN
        ALTER TABLE "entity_secret_permissions"
        DROP CONSTRAINT "entity_secret_permissions_unique_secret_user";
      END IF;
    END;
    $$;
  `);

  await queryInterface.dropTable('entity_secret_permissions');
}
