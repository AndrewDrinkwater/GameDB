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

  // Create unique constraint on (user_id, entity_id, campaign_id)
  await queryInterface.addConstraint('entity_follows', {
    fields: ['user_id', 'entity_id', 'campaign_id'],
    type: 'unique',
    name: 'unique_user_entity_campaign_follow',
  })

  // Create indexes for efficient queries
  await queryInterface.addIndex('entity_follows', ['user_id'], {
    name: 'idx_entity_follows_user_id',
  })

  await queryInterface.addIndex('entity_follows', ['entity_id'], {
    name: 'idx_entity_follows_entity_id',
  })

  await queryInterface.addIndex('entity_follows', ['campaign_id'], {
    name: 'idx_entity_follows_campaign_id',
  })

  await queryInterface.addIndex('entity_follows', ['user_id', 'campaign_id'], {
    name: 'idx_entity_follows_user_campaign',
  })
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable('entity_follows')
}

