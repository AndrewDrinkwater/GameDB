export async function up(queryInterface, Sequelize) {
  // Check if requests table exists first
  const [tableExists] = await queryInterface.sequelize.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'requests'
    );
  `)

  if (!tableExists[0].exists) {
    console.log('⚠️ Requests table does not exist, skipping migration')
    return
  }

  // Add 'testing' to the status enum
  await queryInterface.sequelize.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_requests_status'
      ) AND NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'testing' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_requests_status')
      ) THEN
        ALTER TYPE "public"."enum_requests_status" ADD VALUE 'testing';
      END IF;
    END $$;
  `)

  // Check if tester_id column already exists
  const [columnExistsResult] = await queryInterface.sequelize.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'requests' 
      AND column_name = 'tester_id'
    ) as exists;
  `)

  const testerColumnExists = columnExistsResult[0]?.exists

  // Add tester_id column to requests table if it doesn't exist
  if (!testerColumnExists) {
    await queryInterface.addColumn('requests', 'tester_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'Users', key: 'id' },
      onDelete: 'SET NULL',
    })
  }

  // Create index for tester_id (will skip if already exists)
  await queryInterface.sequelize.query(
    'CREATE INDEX IF NOT EXISTS "idx_requests_tester_id" ON "requests" ("tester_id")'
  )
}

export async function down(queryInterface) {
  // Remove tester_id column
  await queryInterface.removeColumn('requests', 'tester_id')

  // Note: PostgreSQL doesn't support removing enum values easily
  // You would need to recreate the enum type, which is complex
  // We'll leave the 'testing' value in the enum for now
}

