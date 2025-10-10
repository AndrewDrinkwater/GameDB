export async function up(queryInterface) {
  await queryInterface.dropTable('CampaignEntities', { cascade: true })
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.createTable('CampaignEntities', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
      primaryKey: true,
    },
    campaign_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'Campaigns', key: 'id' },
      onDelete: 'CASCADE',
    },
    entity_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'entities', key: 'id' },
      onDelete: 'CASCADE',
    },
    visibility: {
      type: Sequelize.ENUM('visible', 'hidden', 'partial'),
      defaultValue: 'hidden',
    },
    createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
    updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
  })

  await queryInterface.addConstraint('CampaignEntities', {
    fields: ['campaign_id', 'entity_id'],
    type: 'unique',
    name: 'campaign_entities_unique_pair',
  })
}
