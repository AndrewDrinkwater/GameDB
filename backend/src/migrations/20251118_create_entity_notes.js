export async function up(queryInterface, Sequelize) {
  await queryInterface.sequelize.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_entity_notes_share_type'
      ) THEN
        CREATE TYPE "public"."enum_entity_notes_share_type" AS ENUM ('private', 'companions', 'dm', 'party');
      END IF;
    END $$;
  `)

  await queryInterface.createTable('entity_notes', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.literal('uuid_generate_v4()'),
      primaryKey: true,
    },
    entity_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'entities', key: 'id' },
      onDelete: 'CASCADE',
    },
    campaign_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'campaigns', key: 'id' },
      onDelete: 'CASCADE',
    },
    character_id: {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'characters', key: 'id' },
      onDelete: 'SET NULL',
    },
    created_by: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    share_type: {
      type: Sequelize.ENUM({
        name: 'enum_entity_notes_share_type',
        values: ['private', 'companions', 'dm', 'party'],
      }),
      allowNull: false,
      defaultValue: 'private',
    },
    content: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    mentions: {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: [],
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

  await queryInterface.addIndex('entity_notes', ['entity_id'])
  await queryInterface.addIndex('entity_notes', ['campaign_id'])
  await queryInterface.addIndex('entity_notes', ['created_by'])
  await queryInterface.addIndex('entity_notes', ['share_type'])
}

export async function down(queryInterface) {
  await queryInterface.dropTable('entity_notes')
  await queryInterface.sequelize.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_entity_notes_share_type'
      ) THEN
        DROP TYPE "public"."enum_entity_notes_share_type";
      END IF;
    END $$;
  `)
}
