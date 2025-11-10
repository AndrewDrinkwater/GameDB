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
import SessionNoteModel from './sessionNote.js'
import EntityRelationshipTypeModel from './entityRelationshipType.js'
import EntityRelationshipModel from './entityRelationship.js'
import EntityTypeFieldModel from './entityTypeField.js'
import UserCampaignRoleModel from './userCampaignRole.js'
import EntityRelationshipTypeEntityTypeModel from './entityRelationshipTypeEntityType.js'
import EntityListPreferenceModel from './entityListPreference.js'
import UploadedFileModel from './uploadedFile.js' // ✅ new model import

// Create Sequelize instance
export const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
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
export const SessionNote = SessionNoteModel(sequelize, DataTypes)
export const EntityRelationshipType = EntityRelationshipTypeModel(sequelize, DataTypes)
export const EntityRelationship = EntityRelationshipModel(sequelize, DataTypes)
export const EntityTypeField = EntityTypeFieldModel(sequelize, DataTypes)
export const UserCampaignRole = UserCampaignRoleModel(sequelize, DataTypes)
export const EntityRelationshipTypeEntityType =
  EntityRelationshipTypeEntityTypeModel(sequelize, DataTypes)
export const EntityListPreference = EntityListPreferenceModel(sequelize, DataTypes)
export const UploadedFile = UploadedFileModel(sequelize, DataTypes) // ✅ new model init

// --- Associations ---
if (User.associate)
  User.associate({ World, Campaign, Character, UserCampaignRole, UploadedFile }) // ✅ link uploaded files to user
if (World.associate) World.associate({ User, Campaign, Entity, EntityType })
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
  })
if (EntitySecret.associate)
  EntitySecret.associate({ Entity, User, EntitySecretPermission })
if (EntitySecretPermission.associate)
  EntitySecretPermission.associate({ EntitySecret, User, Campaign })
if (EntityNote.associate)
  EntityNote.associate({ Entity, User, Character, Campaign })
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
if (EntityRelationshipTypeEntityType.associate)
  EntityRelationshipTypeEntityType.associate({
    EntityRelationshipType,
    EntityType,
  })
if (UserCampaignRole.associate) UserCampaignRole.associate({ User, Campaign })
if (EntityListPreference.associate)
  EntityListPreference.associate({ EntityType, User })
if (UploadedFile.associate) UploadedFile.associate({ User, Entity }) // ✅ ensure associations registered

// --- Init DB ---
export async function initDB() {
  try {
    await sequelize.authenticate()
    console.log('✅ Database connected')
  } catch (err) {
    console.error('❌ DB connection failed:', err.message)
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
  SessionNote,
  EntityRelationshipType,
  EntityRelationship,
  EntityRelationshipTypeEntityType,
  UserCampaignRole,
  EntityListPreference,
  UploadedFile, // ✅ export for use in routes
}
