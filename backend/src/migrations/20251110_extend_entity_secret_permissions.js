// src/migrations/20251110_extend_entity_secret_permissions.js

export async function up(queryInterface, Sequelize) {
  await queryInterface.changeColumn('entity_secret_permissions', 'user_id', {
    type: Sequelize.UUID,
    allowNull: true,
  });

  await queryInterface.sequelize.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'entity_secret_permissions'
          AND column_name = 'campaign_id'
      ) THEN
        ALTER TABLE "entity_secret_permissions"
        ADD COLUMN "campaign_id" UUID REFERENCES "campaigns" ("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$;
  `);

  await queryInterface.sequelize.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS entity_secret_permissions_unique_secret_campaign
    ON entity_secret_permissions (secret_id, campaign_id)
    WHERE campaign_id IS NOT NULL;
  `);
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.sequelize.query(`
    DROP INDEX IF EXISTS entity_secret_permissions_unique_secret_campaign;
  `);

  await queryInterface.sequelize.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'entity_secret_permissions'
          AND column_name = 'campaign_id'
      ) THEN
        ALTER TABLE "entity_secret_permissions" DROP COLUMN "campaign_id";
      END IF;
    END $$;
  `);

  await queryInterface.changeColumn('entity_secret_permissions', 'user_id', {
    type: Sequelize.UUID,
    allowNull: false,
  });
}
