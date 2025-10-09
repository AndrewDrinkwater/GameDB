// src/migrations/20251010_create_characters.js
export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('Characters', {
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
    name: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    race: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    class: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    level: {
      type: Sequelize.INTEGER,
      defaultValue: 1,
    },
    alignment: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    notes: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    is_active: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
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
  await queryInterface.dropTable('Characters')
}
