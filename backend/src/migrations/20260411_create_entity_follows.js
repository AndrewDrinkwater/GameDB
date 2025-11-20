export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('entity_follows', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
      primaryKey: true,
    },
    user_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'Users', key: 'id' },
      onDelete: 'CASCADE',
    },
    entity_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'entities', key: 'id' },
      onDelete: 'CASCADE',
    },
    campaign_id: {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'Campaigns', key: 'id' },
      onDelete: 'CASCADE',
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

  // Add unique constraint on (user_id, entity_id, campaign_id)
  await queryInterface.sequelize.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_user_entity_campaign_follow'
      ) THEN
        ALTER TABLE "entity_follows"
        ADD CONSTRAINT "unique_user_entity_campaign_follow"
        UNIQUE ("user_id", "entity_id", "campaign_id");
      END IF;
    END $$;
  `)

  // Ensure indexes exist without failing if they were created previously
  await queryInterface.sequelize.query(
    'CREATE INDEX IF NOT EXISTS "idx_entity_follows_user_id" ON "entity_follows" ("user_id")'
  )
  await queryInterface.sequelize.query(
    'CREATE INDEX IF NOT EXISTS "idx_entity_follows_entity_id" ON "entity_follows" ("entity_id")'
  )
  await queryInterface.sequelize.query(
    'CREATE INDEX IF NOT EXISTS "idx_entity_follows_campaign_id" ON "entity_follows" ("campaign_id")'
  )
  await queryInterface.sequelize.query(
    'CREATE INDEX IF NOT EXISTS "idx_entity_follows_user_campaign" ON "entity_follows" ("user_id", "campaign_id")'
  )
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable('entity_follows')
}

