export async function up(pg) {
  await pg.query(`
    CREATE TABLE IF NOT EXISTS entity_relationships (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      from_entity UUID REFERENCES entities(id) ON DELETE CASCADE,
      to_entity UUID REFERENCES entities(id) ON DELETE CASCADE,
      relationship_type VARCHAR(100) NOT NULL, -- e.g. ally_of, enemy_of, member_of
      bidirectional BOOLEAN DEFAULT false,
      context JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
}

export async function down(pg) {
  await pg.query(`DROP TABLE IF EXISTS entity_relationships;`);
}
