export async function up(pg) {
  await pg.query(`
    CREATE TABLE IF NOT EXISTS characters (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      world_id UUID REFERENCES worlds(id) ON DELETE SET NULL,
      campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
      name VARCHAR(255) NOT NULL,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);
}

export async function down(pg) {
  await pg.query(`DROP TABLE IF EXISTS characters;`);
}
