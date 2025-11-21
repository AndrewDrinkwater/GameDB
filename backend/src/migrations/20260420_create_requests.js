export async function up(queryInterface, Sequelize) {
  // Check if requests table already exists
  const [tableExistsResult] = await queryInterface.sequelize.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'requests'
    ) as exists;
  `)

  const requestsTableExists = tableExistsResult[0]?.exists

  // Create enum types if missing (always safe to run)
  await queryInterface.sequelize.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_requests_type'
      ) THEN
        CREATE TYPE "public"."enum_requests_type" AS ENUM ('bug', 'feature');
      END IF;
    END $$;
  `);

  await queryInterface.sequelize.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_requests_status'
      ) THEN
        CREATE TYPE "public"."enum_requests_status" AS ENUM ('open', 'in_progress', 'resolved', 'closed', 'backlog');
      END IF;
    END $$;
  `);

  await queryInterface.sequelize.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_requests_priority'
      ) THEN
        CREATE TYPE "public"."enum_requests_priority" AS ENUM ('low', 'medium', 'high');
      END IF;
    END $$;
  `);

  // Create requests table only if it doesn't exist
  if (!requestsTableExists) {
    await queryInterface.createTable('requests', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
      },
      type: {
        type: Sequelize.ENUM({
          name: 'enum_requests_type',
          values: ['bug', 'feature'],
        }),
        allowNull: false,
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM({
          name: 'enum_requests_status',
          values: ['open', 'in_progress', 'resolved', 'closed', 'backlog'],
        }),
        allowNull: false,
        defaultValue: 'open',
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onDelete: 'CASCADE',
      },
      assigned_to: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onDelete: 'SET NULL',
      },
      priority: {
        type: Sequelize.ENUM({
          name: 'enum_requests_priority',
          values: ['low', 'medium', 'high'],
        }),
        allowNull: true,
      },
      is_in_backlog: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
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
    });
  }

  // Check if request_notes table already exists
  const [notesTableExistsResult] = await queryInterface.sequelize.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'request_notes'
    ) as exists;
  `)

  const notesTableExists = notesTableExistsResult[0]?.exists

  // Create request_notes table only if it doesn't exist
  if (!notesTableExists) {
    await queryInterface.createTable('request_notes', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
      },
      request_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'requests', key: 'id' },
        onDelete: 'CASCADE',
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onDelete: 'CASCADE',
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
    });
  }

  // Create indexes (safe to run - will skip if already exist)
  await queryInterface.sequelize.query(
    'CREATE INDEX IF NOT EXISTS "idx_requests_created_by" ON "requests" ("created_by")'
  );
  await queryInterface.sequelize.query(
    'CREATE INDEX IF NOT EXISTS "idx_requests_assigned_to" ON "requests" ("assigned_to")'
  );
  await queryInterface.sequelize.query(
    'CREATE INDEX IF NOT EXISTS "idx_requests_status" ON "requests" ("status")'
  );
  await queryInterface.sequelize.query(
    'CREATE INDEX IF NOT EXISTS "idx_requests_type" ON "requests" ("type")'
  );
  await queryInterface.sequelize.query(
    'CREATE INDEX IF NOT EXISTS "idx_requests_is_in_backlog" ON "requests" ("is_in_backlog")'
  );
  await queryInterface.sequelize.query(
    'CREATE INDEX IF NOT EXISTS "idx_request_notes_request_id" ON "request_notes" ("request_id")'
  );
  await queryInterface.sequelize.query(
    'CREATE INDEX IF NOT EXISTS "idx_request_notes_created_by" ON "request_notes" ("created_by")'
  );
}

export async function down(queryInterface) {
  await queryInterface.dropTable('request_notes');
  await queryInterface.dropTable('requests');
  
  await queryInterface.sequelize.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_requests_type'
      ) THEN
        DROP TYPE "public"."enum_requests_type";
      END IF;
    END $$;
  `);
  
  await queryInterface.sequelize.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_requests_status'
      ) THEN
        DROP TYPE "public"."enum_requests_status";
      END IF;
    END $$;
  `);
  
  await queryInterface.sequelize.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_requests_priority'
      ) THEN
        DROP TYPE "public"."enum_requests_priority";
      END IF;
    END $$;
  `);
}
