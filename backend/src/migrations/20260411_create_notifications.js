export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('notifications', {
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
    type: {
      type: Sequelize.STRING(100),
      allowNull: false,
      // Using STRING instead of ENUM for extensibility
      // Initial types: 'entity_comment', 'entity_mention_entity_note', 'entity_mention_session_note', 'session_note_added'
    },
    campaign_id: {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'Campaigns', key: 'id' },
      onDelete: 'CASCADE',
    },
    read: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    read_at: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    metadata: {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: {},
      // Stores all context including:
      // - target_id, target_type (generic identifiers for future content types)
      // - entity_id, entity_name (for entity-related notifications)
      // - entity_note_id, session_note_id (for note notifications)
      // - related_entity_id, related_entity_name (for mentions)
      // - author_id, author_name (who triggered the notification)
      // - Type-specific data as needed
    },
    action_url: {
      type: Sequelize.STRING(500),
      allowNull: true,
      // Deep link URL for navigating to related content
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

  // Create indexes for efficient queries
  await queryInterface.addIndex('notifications', ['user_id'], {
    name: 'idx_notifications_user_id',
  })

  await queryInterface.addIndex('notifications', ['read'], {
    name: 'idx_notifications_read',
  })

  await queryInterface.addIndex('notifications', ['created_at'], {
    name: 'idx_notifications_created_at',
  })

  await queryInterface.addIndex('notifications', ['campaign_id'], {
    name: 'idx_notifications_campaign_id',
  })

  await queryInterface.addIndex('notifications', ['type'], {
    name: 'idx_notifications_type',
  })

  await queryInterface.addIndex('notifications', ['user_id', 'read'], {
    name: 'idx_notifications_user_read',
  })

  await queryInterface.addIndex('notifications', ['user_id', 'campaign_id'], {
    name: 'idx_notifications_user_campaign',
  })
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable('notifications')
}

