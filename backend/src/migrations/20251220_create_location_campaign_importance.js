// src/migrations/20251220_create_location_campaign_importance.js
export async function up(queryInterface, Sequelize) {
  // Create enum if missing
  await queryInterface.sequelize.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_location_campaign_importance_importance'
      ) THEN
        CREATE TYPE "public"."enum_location_campaign_importance_importance" AS ENUM ('critical', 'important', 'medium');
      END IF;
    END $$;
  `);

  // Create table using gen_random_uuid for consistency
  await queryInterface.createTable('location_campaign_importance', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
      primaryKey: true,
    },
    location_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'locations', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    campaign_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'Campaigns', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    importance: {
      type: Sequelize.ENUM({
        name: 'enum_location_campaign_importance_importance',
        values: ['critical', 'important', 'medium'],
      }),
      allowNull: true,
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
  });

  // Add unique constraint on (location_id, campaign_id)
  await queryInterface.sequelize.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'location_campaign_importance_unique_location_campaign'
      ) THEN
        ALTER TABLE "location_campaign_importance"
        ADD CONSTRAINT "location_campaign_importance_unique_location_campaign"
        UNIQUE ("location_id", "campaign_id");
      END IF;
    END $$;
  `);

  // Ensure indexes exist without failing if they were created previously
  await queryInterface.sequelize.query(
    'CREATE INDEX IF NOT EXISTS "location_campaign_importance_location_id" ON "location_campaign_importance" ("location_id")'
  );
  await queryInterface.sequelize.query(
    'CREATE INDEX IF NOT EXISTS "location_campaign_importance_campaign_id" ON "location_campaign_importance" ("campaign_id")'
  );
  await queryInterface.sequelize.query(
    'CREATE INDEX IF NOT EXISTS "location_campaign_importance_importance" ON "location_campaign_importance" ("importance")'
  );
}

export async function down(queryInterface) {
  await queryInterface.dropTable('location_campaign_importance');
  await queryInterface.sequelize.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_location_campaign_importance_importance'
      ) THEN
        DROP TYPE "public"."enum_location_campaign_importance_importance";
      END IF;
    END $$;
  `);
}

