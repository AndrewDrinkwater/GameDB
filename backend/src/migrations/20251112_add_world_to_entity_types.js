const CONSTRAINT_BASENAME = 'entity_types_name_key'

const dropExistingNameConstraints = async (queryInterface) => {
  const dropStatements = []
  dropStatements.push(`ALTER TABLE IF EXISTS entity_types DROP CONSTRAINT IF EXISTS "${CONSTRAINT_BASENAME}";`)
  for (let index = 1; index <= 40; index += 1) {
    dropStatements.push(
      `ALTER TABLE IF EXISTS entity_types DROP CONSTRAINT IF EXISTS "${CONSTRAINT_BASENAME}${index}";`
    )
  }

  for (const statement of dropStatements) {
    // eslint-disable-next-line no-await-in-loop
    await queryInterface.sequelize.query(statement)
  }
}

export const up = async (queryInterface, Sequelize) => {
  // Only add world_id if it doesn't already exist
  await queryInterface.sequelize.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'entity_types'
          AND column_name = 'world_id'
      ) THEN
        ALTER TABLE "entity_types"
        ADD COLUMN "world_id" UUID REFERENCES "Worlds" ("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$;
  `)

  // Populate world_id values where possible
  await queryInterface.sequelize.query(`
    UPDATE entity_types AS et
    SET world_id = sub.world_id
    FROM (
      SELECT DISTINCT ON (entity_type_id) entity_type_id, world_id
      FROM entities
      WHERE world_id IS NOT NULL
      ORDER BY entity_type_id, created_at DESC
    ) AS sub
    WHERE et.id = sub.entity_type_id AND et.world_id IS NULL;
  `)

  // Drop any existing name-based unique constraints
  await dropExistingNameConstraints(queryInterface)

  // Add new unique constraint on (world_id, name)
  await queryInterface.addConstraint('entity_types', {
    fields: ['world_id', 'name'],
    type: 'unique',
    name: 'entity_types_world_id_name_key',
  })
}

export const down = async (queryInterface) => {
  // Remove new constraint and column
  await queryInterface.removeConstraint('entity_types', 'entity_types_world_id_name_key')
  await queryInterface.removeColumn('entity_types', 'world_id')

  // Reinstate old name-only unique constraint
  await queryInterface.addConstraint('entity_types', {
    fields: ['name'],
    type: 'unique',
    name: 'entity_types_name_key',
  })
}
