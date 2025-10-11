// src/migrations/20251011_create_user_campaign_roles.js
export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('UserCampaignRoles', {
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
    campaign_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'Campaigns', key: 'id' },
      onDelete: 'CASCADE',
    },
    role: {
      type: Sequelize.ENUM('dm', 'player', 'observer'),
      allowNull: false,
    },
    createdAt: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.literal('NOW()'),
    },
  });

  // Add unique constraint for user+campaign combo, only if it doesn't already exist
  await queryInterface.sequelize.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_user_campaign_role'
      ) THEN
        ALTER TABLE "UserCampaignRoles"
        ADD CONSTRAINT "unique_user_campaign_role"
        UNIQUE ("user_id", "campaign_id");
      END IF;
    END;
    $$;
  `);
}

export async function down(queryInterface) {
  await queryInterface.dropTable('UserCampaignRoles');
}
