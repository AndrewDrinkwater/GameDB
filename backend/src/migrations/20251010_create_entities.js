export async function up(pg) {
  await pg.query(`
    CREATE TABLE IF NOT EXISTS entities (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      world_id UUID REFERENCES worlds(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL, -- npc, location, organisation, etc.
      name VARCHAR(255) NOT NULL,
      description TEXT,
      metadata JSONB DEFAULT '{}'::jsonb,
      visibility VARCHAR(50) DEFAULT 'private', -- public | private | restricted
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);
}

export async function down(pg) {
  await pg.query(`DROP TABLE IF EXISTS entities;`);
}
