export async function up(queryInterface, Sequelize) {
  // Create enum if missing
  await queryInterface.sequelize.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_location_notes_share_type'
      ) THEN
        CREATE TYPE "public"."enum_location_notes_share_type" AS ENUM ('private', 'companions', 'dm', 'party');
      END IF;
    END $$;
  `);

  // Create table using gen_random_uuid for consistency
  await queryInterface.createTable('location_notes', {
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
    },
    campaign_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'Campaigns', key: 'id' },
      onDelete: 'CASCADE',
    },
    character_id: {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'Characters', key: 'id' },
      onDelete: 'SET NULL',
    },
    created_by: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'Users', key: 'id' },
      onDelete: 'CASCADE',
    },
    share_type: {
      type: Sequelize.ENUM({
        name: 'enum_location_notes_share_type',
        values: ['private', 'companions', 'dm', 'party'],
      }),
      allowNull: false,
      defaultValue: 'private',
    },
    content: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    mentions: {
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
  });

  // Ensure indexes exist without failing if they were created previously
  await queryInterface.sequelize.query(
    'CREATE INDEX IF NOT EXISTS "location_notes_location_id" ON "location_notes" ("location_id")'
  );
  await queryInterface.sequelize.query(
    'CREATE INDEX IF NOT EXISTS "location_notes_campaign_id" ON "location_notes" ("campaign_id")'
  );
  await queryInterface.sequelize.query(
    'CREATE INDEX IF NOT EXISTS "location_notes_created_by" ON "location_notes" ("created_by")'
  );
  await queryInterface.sequelize.query(
    'CREATE INDEX IF NOT EXISTS "location_notes_share_type" ON "location_notes" ("share_type")'
  );
}

export async function down(queryInterface) {
  await queryInterface.dropTable('location_notes');
  await queryInterface.sequelize.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_location_notes_share_type'
      ) THEN
        DROP TYPE "public"."enum_location_notes_share_type";
      END IF;
    END $$;
  `);
}

