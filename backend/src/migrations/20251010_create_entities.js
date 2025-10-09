export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('Entities', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
      primaryKey: true,
    },
    world_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'Worlds', key: 'id' },
      onDelete: 'CASCADE',
    },
    type: {
      type: Sequelize.STRING(50),
      allowNull: false, // npc, location, organisation, etc.
    },
    name: {
      type: Sequelize.STRING(255),
      allowNull: false,
    },
    description: {
      type: Sequelize.TEXT,
    },
    metadata: {
      type: Sequelize.JSONB,
      defaultValue: {},
    },
    visibility: {
      type: Sequelize.ENUM('visible', 'hidden', 'partial'),
      defaultValue: 'hidden',
    },
    createdAt: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.literal('NOW()'),
    },
    updatedAt: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.literal('NOW()'),
    },
  })
}

export async function down(queryInterface) {
  await queryInterface.dropTable('Entities')
}
