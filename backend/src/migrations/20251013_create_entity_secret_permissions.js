export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('entity_secret_permissions', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
      primaryKey: true,
    },
    secret_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'entity_secrets', key: 'id' },
      onDelete: 'CASCADE',
    },
    user_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'Users', key: 'id' },
      onDelete: 'CASCADE',
    },
    can_view: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('NOW()'),
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('NOW()'),
    },
  })

  await queryInterface.addConstraint('entity_secret_permissions', {
    fields: ['secret_id', 'user_id'],
    type: 'unique',
    name: 'entity_secret_permissions_unique_secret_user',
  })
}

export async function down(queryInterface) {
  await queryInterface.removeConstraint(
    'entity_secret_permissions',
    'entity_secret_permissions_unique_secret_user'
  )
  await queryInterface.dropTable('entity_secret_permissions')
}
