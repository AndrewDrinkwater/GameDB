// src/migrations/20251223_create_location_follows.js
export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('location_follows', {
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
      onUpdate: 'CASCADE',
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
      allowNull: true,
      references: { model: 'Campaigns', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
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

  // Create unique index on user_id, location_id, campaign_id
  await queryInterface.addIndex('location_follows', {
    fields: ['user_id', 'location_id', 'campaign_id'],
    unique: true,
    name: 'location_follows_user_location_campaign_unique',
  })

  // Create index on user_id for faster lookups
  await queryInterface.addIndex('location_follows', {
    fields: ['user_id'],
    name: 'location_follows_user_id_idx',
  })

  // Create index on location_id for faster lookups
  await queryInterface.addIndex('location_follows', {
    fields: ['location_id'],
    name: 'location_follows_location_id_idx',
  })
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable('location_follows')
}

