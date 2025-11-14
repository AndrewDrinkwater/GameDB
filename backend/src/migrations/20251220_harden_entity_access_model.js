const ARRAY_COLUMNS = [
  'read_campaign_ids',
  'read_user_ids',
  'read_character_ids',
  'write_campaign_ids',
  'write_user_ids',
]

const INDEX_DEFINITIONS = [
  { name: 'idx_entities_read_campaign_ids', column: 'read_campaign_ids' },
  { name: 'idx_entities_read_user_ids', column: 'read_user_ids' },
  { name: 'idx_entities_read_character_ids', column: 'read_character_ids' },
  { name: 'idx_entities_write_campaign_ids', column: 'write_campaign_ids' },
  { name: 'idx_entities_write_user_ids', column: 'write_user_ids' },
]

const ensureArrayColumnShape = async (queryInterface, column) => {
  await queryInterface.sequelize.query(`
    ALTER TABLE "entities"
    ALTER COLUMN "${column}" SET DEFAULT ARRAY[]::uuid[];
  `)

  await queryInterface.sequelize.query(`
    UPDATE "entities"
    SET "${column}" = ARRAY[]::uuid[]
    WHERE "${column}" IS NULL;
  `)

  await queryInterface.sequelize.query(`
    ALTER TABLE "entities"
    ALTER COLUMN "${column}" SET NOT NULL;
  `)
}

const createGinIndexIfMissing = async (queryInterface, { name, column }) => {
  await queryInterface.sequelize.query(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS ${name}
    ON "entities" USING GIN ("${column}");
  `)
}

export async function up(queryInterface) {
  await queryInterface.sequelize.query(`
    ALTER TABLE "entities"
    ADD COLUMN IF NOT EXISTS "read_character_ids" UUID[] NOT NULL DEFAULT ARRAY[]::uuid[];
  `)

  await queryInterface.sequelize.query(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'entity_write_access') THEN
        BEGIN
          ALTER TYPE entity_write_access ADD VALUE 'owner_only';
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END;
      ELSIF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_entities_write_access') THEN
        BEGIN
          ALTER TYPE enum_entities_write_access ADD VALUE 'owner_only';
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END;
      ELSE
        RAISE EXCEPTION 'Enum not found';
      END IF;
    END $$;
  `)

  for (const column of ARRAY_COLUMNS) {
    await ensureArrayColumnShape(queryInterface, column)
  }

  const [auditRows] = await queryInterface.sequelize.query(`
    SELECT column_name, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'entities'
      AND column_name = ANY(ARRAY[${ARRAY_COLUMNS.map((column) => `'${column}'`).join(', ')}]);
  `)

  const invalidColumns = auditRows.filter((row) => {
    const defaultValue = String(row.column_default ?? '')
    return row.is_nullable !== 'NO' || !defaultValue.includes('ARRAY[]::uuid[]')
  })

  if (invalidColumns.length > 0) {
    const columnList = invalidColumns.map((row) => row.column_name).join(', ')
    throw new Error(`Array access columns missing constraints: ${columnList}`)
  }

  for (const indexDefinition of INDEX_DEFINITIONS) {
    await createGinIndexIfMissing(queryInterface, indexDefinition)
  }
}

export async function down(queryInterface) {
  for (const { name } of INDEX_DEFINITIONS) {
    await queryInterface.sequelize.query(`
      DROP INDEX CONCURRENTLY IF EXISTS ${name};
    `)
  }

  await queryInterface.sequelize.query(`
    ALTER TABLE "entities"
    DROP COLUMN IF EXISTS "read_character_ids";
  `)
}
