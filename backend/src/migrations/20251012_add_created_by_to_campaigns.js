export async function up(queryInterface, Sequelize) {
  // Create table if it doesn’t exist
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

  // ✅ Skip unique constraint if it exists
  try {
    const [exists] = await queryInterface.sequelize.query(`
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_name = 'UserCampaignRoles'
      AND constraint_name = 'unique_user_campaign_role';
    `);

    if (exists.length === 0) {
      console.log('🧩 Creating unique_user_campaign_role constraint…');
      await queryInterface.addConstraint('UserCampaignRoles', {
        fields: ['user_id', 'campaign_id'],
        type: 'unique',
        name: 'unique_user_campaign_role',
      });
    } else {
      console.log('⚠️ Skipping duplicate constraint: unique_user_campaign_role already exists.');
    }
  } catch (err) {
    console.log('⚠️ Error checking/creating constraint:', err.message);
  }
}

export async function down(queryInterface) {
  try {
    await queryInterface.removeConstraint('UserCampaignRoles', 'unique_user_campaign_role');
  } catch (err) {
    console.log('⚠️ No constraint to remove:', err.message);
  }
  await queryInterface.dropTable('UserCampaignRoles');
}
