// src/migrations/20251108_update_entity_visibility_default.js

export async function up(queryInterface) {
  await queryInterface.sequelize.query(`
    ALTER TABLE "entities" ALTER COLUMN "visibility" SET DEFAULT 'visible'::public.enum_entities_visibility;
  `)
}

export async function down(queryInterface) {
  await queryInterface.sequelize.query(`
    ALTER TABLE "entities" ALTER COLUMN "visibility" SET DEFAULT 'hidden'::public.enum_entities_visibility;
  `)
}
