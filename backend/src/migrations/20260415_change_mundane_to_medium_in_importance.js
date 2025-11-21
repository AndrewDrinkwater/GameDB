// src/migrations/20260415_change_mundane_to_medium_in_importance.js
export async function up(queryInterface, Sequelize) {
  // Step 1: Add 'medium' value to the enum
  await queryInterface.sequelize.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'medium' 
        AND enumtypid = (
          SELECT oid FROM pg_type WHERE typname = 'enum_entity_campaign_importance_importance'
        )
      ) THEN
        ALTER TYPE "public"."enum_entity_campaign_importance_importance" ADD VALUE 'medium';
      END IF;
    END $$;
  `);

  // Step 2: Check if 'mundane' exists in the enum, and if so, update all records to 'medium'
  await queryInterface.sequelize.query(`
    DO $$
    DECLARE
      has_mundane BOOLEAN;
      enum_type_oid OID;
    BEGIN
      -- Get the enum type OID
      SELECT oid INTO enum_type_oid 
      FROM pg_type 
      WHERE typname = 'enum_entity_campaign_importance_importance';
      
      IF enum_type_oid IS NOT NULL THEN
        -- Check if 'mundane' exists in the enum
        SELECT EXISTS (
          SELECT 1 FROM pg_enum 
          WHERE enumlabel = 'mundane' 
          AND enumtypid = enum_type_oid
        ) INTO has_mundane;
        
        -- Only update if 'mundane' exists in the enum
        IF has_mundane THEN
          -- Update all existing 'mundane' records to 'medium'
          -- Cast to text in WHERE clause to avoid enum validation errors
          -- Must use EXECUTE because direct comparison with 'mundane' fails if not in enum
          EXECUTE $sql$
            UPDATE "entity_campaign_importance" 
            SET importance = 'medium'::"public"."enum_entity_campaign_importance_importance" 
            WHERE importance::text = 'mundane'
          $sql$;
        END IF;
      END IF;
    END $$;
  `);

  // Step 3: Remove 'mundane' from the enum by recreating it
  // Only do this if 'mundane' still exists in the enum
  await queryInterface.sequelize.query(`
    DO $$
    DECLARE
      has_mundane BOOLEAN;
      enum_type_oid OID;
    BEGIN
      -- Get the enum type OID
      SELECT oid INTO enum_type_oid 
      FROM pg_type 
      WHERE typname = 'enum_entity_campaign_importance_importance';
      
      IF enum_type_oid IS NOT NULL THEN
        -- Check if 'mundane' exists in the enum
        SELECT EXISTS (
          SELECT 1 FROM pg_enum 
          WHERE enumlabel = 'mundane' 
          AND enumtypid = enum_type_oid
        ) INTO has_mundane;
        
        -- Only recreate enum if 'mundane' still exists
        IF has_mundane THEN
          -- Create a new enum type with the correct values
          IF NOT EXISTS (
            SELECT 1 FROM pg_type WHERE typname = 'enum_entity_campaign_importance_importance_new'
          ) THEN
            CREATE TYPE "public"."enum_entity_campaign_importance_importance_new" AS ENUM ('critical', 'important', 'medium');
          END IF;
          
          -- Alter the column to use the new enum type
          ALTER TABLE "entity_campaign_importance"
            ALTER COLUMN importance TYPE "public"."enum_entity_campaign_importance_importance_new"
            USING importance::text::"public"."enum_entity_campaign_importance_importance_new";
          
          -- Drop the old enum type
          DROP TYPE IF EXISTS "public"."enum_entity_campaign_importance_importance";
          
          -- Rename the new enum type to the original name
          ALTER TYPE "public"."enum_entity_campaign_importance_importance_new" 
            RENAME TO "enum_entity_campaign_importance_importance";
        END IF;
      END IF;
    END $$;
  `);
}

export async function down(queryInterface) {
  // Reverse the process: change 'medium' back to 'mundane'
  await queryInterface.sequelize.query(`
    DO $$
    BEGIN
      -- Add 'mundane' back to the enum
      IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'mundane' 
        AND enumtypid = (
          SELECT oid FROM pg_type WHERE typname = 'enum_entity_campaign_importance_importance'
        )
      ) THEN
        ALTER TYPE "public"."enum_entity_campaign_importance_importance" ADD VALUE 'mundane';
      END IF;
    END $$;
  `);

  // Update all 'medium' records back to 'mundane'
  await queryInterface.sequelize.query(`
    UPDATE "entity_campaign_importance"
    SET importance = 'mundane'
    WHERE importance = 'medium';
  `);

  // Recreate enum without 'medium'
  await queryInterface.sequelize.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_entity_campaign_importance_importance_old'
      ) THEN
        CREATE TYPE "public"."enum_entity_campaign_importance_importance_old" AS ENUM ('critical', 'important', 'mundane');
      END IF;
      
      ALTER TABLE "entity_campaign_importance"
        ALTER COLUMN importance TYPE "public"."enum_entity_campaign_importance_importance_old"
        USING importance::text::"public"."enum_entity_campaign_importance_importance_old";
      
      DROP TYPE IF EXISTS "public"."enum_entity_campaign_importance_importance";
      
      ALTER TYPE "public"."enum_entity_campaign_importance_importance_old" 
        RENAME TO "enum_entity_campaign_importance_importance";
    END $$;
  `);
}

