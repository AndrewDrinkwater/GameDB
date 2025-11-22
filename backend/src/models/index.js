// src/models/index.js
import { Sequelize, DataTypes } from 'sequelize'
import dotenv from 'dotenv'
dotenv.config()

// Import models
import UserModel from './user.js'
import WorldModel from './world.js'
import CampaignModel from './campaign.js'
import CharacterModel from './character.js'
import EntityModel from './entity.js'
import EntityTypeModel from './entityType.js'
import EntitySecretModel from './entitySecret.js'
import EntitySecretPermissionModel from './entitySecretPermission.js'
import EntityNoteModel from './entityNote.js'
import EntityCampaignImportanceModel from './entityCampaignImportance.js'
import SessionNoteModel from './sessionNote.js'
import EntityRelationshipTypeModel from './entityRelationshipType.js'
import EntityRelationshipModel from './entityRelationship.js'
import EntityTypeFieldModel from './entityTypeField.js'
import EntityTypeFieldLayoutModel from './entityTypeFieldLayout.js'
import EntityTypeFieldRuleModel from './entityTypeFieldRule.js'
import UserCampaignRoleModel from './userCampaignRole.js'
import EntityRelationshipTypeEntityTypeModel from './entityRelationshipTypeEntityType.js'
import EntityListPreferenceModel from './entityListPreference.js'
import UploadedFileModel from './uploadedFile.js' // ✅ new model import
import BulkUpdateRunModel from './bulkUpdateRun.js'
import BulkUpdateChangeModel from './bulkUpdateChange.js'
import EntityCollectionModel from './entityCollection.js'
import EntityFollowModel from './entityFollow.js'
import NotificationModel from './notification.js'
import RequestModel from './request.js'
import RequestNoteModel from './requestNote.js'
import LocationModel from './location.js'
import LocationTypeModel from './locationType.js'
import LocationTypeFieldModel from './locationTypeField.js'

// Create Sequelize instance
// Ensure password is always a string (required by PostgreSQL SCRAM authentication)
// If DB_PASS is undefined or null, use empty string; otherwise convert to string
const dbPassword = process.env.DB_PASS == null ? '' : String(process.env.DB_PASS)

const isProduction = process.env.NODE_ENV === 'production'

export const sequelize = new Sequelize({
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: dbPassword,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  dialect: 'postgres',
  logging: false,
  dialectOptions: isProduction
    ? {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      }
    : {}
})

// Initialise models
export const User = UserModel(sequelize, DataTypes)
export const World = WorldModel(sequelize, DataTypes)
export const Campaign = CampaignModel(sequelize, DataTypes)
export const Character = CharacterModel(sequelize, DataTypes)
export const EntityType = EntityTypeModel(sequelize, DataTypes)
export const Entity = EntityModel(sequelize, DataTypes)
export const EntitySecret = EntitySecretModel(sequelize, DataTypes)
export const EntitySecretPermission = EntitySecretPermissionModel(sequelize, DataTypes)
export const EntityNote = EntityNoteModel(sequelize, DataTypes)
export const EntityCampaignImportance = EntityCampaignImportanceModel(sequelize, DataTypes)
export const SessionNote = SessionNoteModel(sequelize, DataTypes)
export const EntityRelationshipType = EntityRelationshipTypeModel(sequelize, DataTypes)
export const EntityRelationship = EntityRelationshipModel(sequelize, DataTypes)
export const EntityTypeField = EntityTypeFieldModel(sequelize, DataTypes)
export const EntityTypeFieldLayout = EntityTypeFieldLayoutModel(sequelize, DataTypes)
export const EntityTypeFieldRule = EntityTypeFieldRuleModel(sequelize, DataTypes)
export const UserCampaignRole = UserCampaignRoleModel(sequelize, DataTypes)
export const EntityRelationshipTypeEntityType =
  EntityRelationshipTypeEntityTypeModel(sequelize, DataTypes)
export const EntityListPreference = EntityListPreferenceModel(sequelize, DataTypes)
export const UploadedFile = UploadedFileModel(sequelize, DataTypes) // ✅ new model init
export const BulkUpdateRun = BulkUpdateRunModel(sequelize, DataTypes)
export const BulkUpdateChange = BulkUpdateChangeModel(sequelize, DataTypes)
export const EntityCollection = EntityCollectionModel(sequelize, DataTypes)
export const EntityFollow = EntityFollowModel(sequelize, DataTypes)
export const Notification = NotificationModel(sequelize, DataTypes)
export const Request = RequestModel(sequelize, DataTypes)
export const RequestNote = RequestNoteModel(sequelize, DataTypes)
export const Location = LocationModel(sequelize, DataTypes)
export const LocationType = LocationTypeModel(sequelize, DataTypes)
export const LocationTypeField = LocationTypeFieldModel(sequelize, DataTypes)

// --- Associations ---
if (User.associate)
  User.associate({ World, Campaign, Character, UserCampaignRole, UploadedFile }) // ✅ link uploaded files to user
if (World.associate) World.associate({ User, Campaign, Entity, EntityType, Location, LocationType })
if (Campaign.associate)
  Campaign.associate({ World, Character, User, UserCampaignRole, SessionNote })
if (Character.associate) Character.associate({ Campaign, User })
if (EntityType.associate) EntityType.associate({ Entity, EntityTypeField, World })
if (Entity.associate)
  Entity.associate({
    World,
    EntityType,
    EntitySecret,
    EntityNote,
    User,
    EntityRelationship,
    UploadedFile, // ✅ link uploaded files to entity
    Location, // ✅ link entities to locations
  })
if (EntitySecret.associate)
  EntitySecret.associate({ Entity, User, EntitySecretPermission })
if (EntitySecretPermission.associate)
  EntitySecretPermission.associate({ EntitySecret, User, Campaign })
if (EntityNote.associate)
  EntityNote.associate({ Entity, User, Character, Campaign })
if (EntityCampaignImportance.associate)
  EntityCampaignImportance.associate({ Entity, Campaign })
if (SessionNote.associate) SessionNote.associate({ Campaign, User })
if (EntityRelationshipType.associate)
  EntityRelationshipType.associate({
    EntityRelationship,
    World,
    EntityRelationshipTypeEntityType,
    EntityType,
  })
if (EntityRelationship.associate)
  EntityRelationship.associate({ Entity, EntityRelationshipType })
if (EntityTypeField.associate) EntityTypeField.associate({ EntityType })
if (EntityTypeFieldLayout.associate)
  EntityTypeFieldLayout.associate({ EntityType, EntityTypeField })
if (EntityTypeFieldRule.associate) EntityTypeFieldRule.associate({ EntityType })
if (EntityRelationshipTypeEntityType.associate)
  EntityRelationshipTypeEntityType.associate({
    EntityRelationshipType,
    EntityType,
  })
if (UserCampaignRole.associate) UserCampaignRole.associate({ User, Campaign })
if (EntityListPreference.associate)
  EntityListPreference.associate({ EntityType, User })
if (UploadedFile.associate) UploadedFile.associate({ User, Entity }) // ✅ ensure associations registered
if (BulkUpdateRun.associate)
  BulkUpdateRun.associate({ User, World, Campaign, BulkUpdateChange })
if (BulkUpdateChange.associate)
  BulkUpdateChange.associate({ BulkUpdateRun, Entity })
if (EntityCollection.associate) EntityCollection.associate({ World, User })
if (EntityFollow.associate) EntityFollow.associate({ User, Entity, Campaign })
if (Notification.associate) Notification.associate({ User, Campaign })
if (Request.associate) Request.associate({ User, RequestNote })
if (RequestNote.associate) RequestNote.associate({ Request, User })
if (Location.associate) Location.associate({ World, User, LocationType, Location, Entity })
if (LocationType.associate) LocationType.associate({ World, LocationType, Location, LocationTypeField })
if (LocationTypeField.associate) LocationTypeField.associate({ LocationType })

// --- Init DB ---
export async function initDB() {
  try {
    console.log('Attempting database connection...')
    await sequelize.authenticate()
    console.log('✅ Database connection successful - sequelize.authenticate() succeeded')
  } catch (err) {
    console.error('❌ Database connection failed - sequelize.authenticate() failed:', err.message)
    throw err // Re-throw to allow start() to handle the error
  }
}

export default {
  sequelize,
  User,
  World,
  Campaign,
  Character,
  EntityType,
  Entity,
  EntitySecret,
  EntitySecretPermission,
  EntityNote,
  EntityCampaignImportance,
  SessionNote,
  EntityRelationshipType,
  EntityRelationship,
  EntityRelationshipTypeEntityType,
  UserCampaignRole,
  EntityListPreference,
  UploadedFile, // ✅ export for use in routes
  BulkUpdateRun,
  BulkUpdateChange,
  EntityCollection,
  EntityTypeFieldLayout,
  EntityTypeFieldRule,
  EntityFollow,
  Notification,
  Request,
  RequestNote,
  Location,
  LocationType,
  LocationTypeField,
}
