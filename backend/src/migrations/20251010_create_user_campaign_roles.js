export async function up(pg) {
  await pg.query(`
    CREATE TABLE IF NOT EXISTS user_campaign_roles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
      role VARCHAR(50) NOT NULL, -- dm | player | observer
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (user_id, campaign_id)
    );
  `);
}

export async function down(pg) {
  await pg.query(`DROP TABLE IF EXISTS user_campaign_roles;`);
}
