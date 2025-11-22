// src/migrations/20241222_create_locations.js
export async function up(queryInterface, Sequelize) {
  // Create location_types table
  await queryInterface.createTable('location_types', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    world_id: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'Worlds',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    name: {
      type: Sequelize.STRING(100),
      allowNull: false,
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    parent_type_id: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'location_types',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    sort_order: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
  })

  // Create location_type_fields table
  await queryInterface.createTable('location_type_fields', {
    id: {
      type: Sequelize.UUID,
      primaryKey: true,
      defaultValue: Sequelize.UUIDV4,
    },
    location_type_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'location_types',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    name: {
      type: Sequelize.STRING(100),
      allowNull: false,
    },
    label: {
      type: Sequelize.STRING(100),
      allowNull: true,
    },
    data_type: {
      type: Sequelize.ENUM('string', 'number', 'boolean', 'text', 'date', 'enum', 'reference'),
      allowNull: false,
    },
    reference_type_id: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'location_types',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    reference_filter: {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    options: {
      type: Sequelize.JSONB,
      defaultValue: {},
    },
    required: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    },
    default_value: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    visible_by_default: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    sort_order: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    },
  })

  // Create locations table
  await queryInterface.createTable('locations', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    world_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'Worlds',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    created_by: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    location_type_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'location_types',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    },
    parent_id: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'locations',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    name: {
      type: Sequelize.STRING(255),
      allowNull: false,
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    metadata: {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    // Future map integration fields
    coordinates: {
      type: Sequelize.JSONB,
      allowNull: true,
      comment: 'Coordinates for map integration (e.g., {x: 100, y: 200})',
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
  })

  // Add indexes for performance
  await queryInterface.addIndex('locations', ['world_id'])
  await queryInterface.addIndex('locations', ['parent_id'])
  await queryInterface.addIndex('locations', ['location_type_id'])
  await queryInterface.addIndex('location_types', ['world_id'])
  await queryInterface.addIndex('location_types', ['parent_type_id'])
  await queryInterface.addIndex('location_type_fields', ['location_type_id'])

  // Add location_id to entities table
  await queryInterface.sequelize.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'entities'
          AND column_name = 'location_id'
      ) THEN
        ALTER TABLE "entities" ADD COLUMN "location_id" uuid;
        ALTER TABLE "entities" ADD CONSTRAINT "entities_location_id_fkey"
          FOREIGN KEY ("location_id")
          REFERENCES "locations"("id")
          ON UPDATE CASCADE
          ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS "entities_location_id_idx" ON "entities"("location_id");
      END IF;
    END $$;
  `)
}

export async function down(queryInterface) {
  // Remove location_id from entities
  await queryInterface.sequelize.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'entities'
          AND column_name = 'location_id'
      ) THEN
        DROP INDEX IF EXISTS "entities_location_id_idx";
        ALTER TABLE "entities" DROP CONSTRAINT IF EXISTS "entities_location_id_fkey";
        ALTER TABLE "entities" DROP COLUMN "location_id";
      END IF;
    END $$;
  `)

  // Drop tables in reverse order
  await queryInterface.dropTable('locations')
  await queryInterface.dropTable('location_type_fields')
  await queryInterface.dropTable('location_types')
}

