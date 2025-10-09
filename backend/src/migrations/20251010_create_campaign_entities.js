export async function up(pg) {
  await pg.query(`
    CREATE TABLE IF NOT EXISTS campaign_entities (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
      entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
      override_data JSONB DEFAULT '{}'::jsonb,
      override_visibility VARCHAR(50),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);
}

export async function down(pg) {
  await pg.query(`DROP TABLE IF EXISTS campaign_entities;`);
}
