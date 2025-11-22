import { Op } from 'sequelize'
import {
  BulkUpdateChange,
  Campaign,
  Entity,
  EntityCampaignImportance,
  EntityNote,
  EntityRelationship,
  EntitySecret,
  EntitySecretPermission,
  EntityType,
  EntityTypeField,
  Location,
  LocationType,
  SessionNote,
  User,
  UserCampaignRole,
  World,
  sequelize,
} from '../models/index.js'
import { checkWorldAccess } from '../middleware/worldAccess.js'
import {
  applyFieldDefaults,
  coerceValueForField,
  validateEntityMetadata,
} from '../utils/entityMetadataValidator.js'
import { applyRelBuilderHeader } from '../utils/featureFlags.js'
import {
  buildEntityReadContext,
  buildReadableEntitiesWhereClause,
  canUserReadEntity,
  canUserWriteEntity,
  fetchUserWorldCharacterCampaignIds,
} from '../utils/entityAccess.js'

const VISIBILITY_VALUES = new Set(['hidden', 'visible', 'partial'])
const PUBLIC_VISIBILITY = ['visible', 'partial']

const READ_ACCESS_VALUES = new Set(['global', 'selective', 'hidden'])
const WRITE_ACCESS_VALUES = new Set(['global', 'selective', 'hidden', 'owner_only'])
const MAX_IMAGE_MIME_TYPE_LENGTH = 50

const normaliseImageDataInput = (value) => {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value !== 'string') {
    throw new Error('image_data must be a string')
  }
  return value
}

const normaliseImageMimeTypeInput = (value) => {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value !== 'string') {
    throw new Error('image_mime_type must be a string')
  }
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }
  if (trimmed.length > MAX_IMAGE_MIME_TYPE_LENGTH) {
    throw new Error(`image_mime_type must be at most ${MAX_IMAGE_MIME_TYPE_LENGTH} characters`)
  }
  return trimmed
}

const isEntityCreator = (entity, user) => entity?.created_by === user?.id

const normaliseAccessValue = (value, fieldName) => {
  if (value === undefined) return undefined

  if (value === null) {
    throw new Error(`${fieldName} cannot be null`)
  }

  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string`)
  }

  const trimmed = value.trim().toLowerCase()
  const allowedValues = fieldName === 'write_access' ? WRITE_ACCESS_VALUES : READ_ACCESS_VALUES

  if (!allowedValues.has(trimmed)) {
    throw new Error(
      `${fieldName} must be one of: ${Array.from(allowedValues).join(', ')}`,
    )
  }

  return trimmed
}

const normaliseUuidArray = (value, fieldName) => {
  if (value === undefined) return undefined

  if (value === null) return []

  if (Array.isArray(value)) {
    const normalised = value
      .map((entry) => {
        if (entry === null || entry === undefined) return null
        const trimmed = String(entry).trim()
        return trimmed || null
      })
      .filter(Boolean)

    return normalised
  }

  throw new Error(`${fieldName} must be an array`)
}

const toUniqueStringList = (values) => {
  if (!Array.isArray(values)) return []
  const seen = new Set()
  const result = []
  values.forEach((entry) => {
    if (entry === null || entry === undefined) return
    const str = String(entry).trim()
    if (!str || seen.has(str)) return
    seen.add(str)
    result.push(str)
  })
  return result
}

const normaliseId = (value) => {
  if (value === undefined || value === null) return null
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed || null
  }
  if (typeof value === 'object') {
    const candidate = value.id ?? value.campaign_id ?? null
    if (candidate !== null && candidate !== undefined) {
      return normaliseId(candidate)
    }
  }
  const stringValue = String(value).trim()
  return stringValue || null
}

const ENTITY_CREATION_SCOPES = new Set(['owner_dm', 'all_players'])
const DEFAULT_ENTITY_CREATION_SCOPE = 'owner_dm'

const normaliseEntityCreationScope = (value) => {
  if (typeof value !== 'string') return DEFAULT_ENTITY_CREATION_SCOPE
  const trimmed = value.trim().toLowerCase()
  if (ENTITY_CREATION_SCOPES.has(trimmed)) {
    return trimmed
  }
  return DEFAULT_ENTITY_CREATION_SCOPE
}

const resolveCampaignMembership = async ({ worldId, campaignContextId, userId }) => {
  const resolvedWorldId = normaliseId(worldId)
  const resolvedCampaignId = normaliseId(campaignContextId)

  if (!resolvedWorldId || !resolvedCampaignId) {
    return null
  }

  const campaign = await Campaign.findOne({
    where: { id: resolvedCampaignId, world_id: resolvedWorldId },
    attributes: ['id'],
  })

  if (!campaign) {
    return null
  }

  if (!userId) {
    return { campaignId: String(campaign.id), membershipRole: null }
  }

  const membership = await UserCampaignRole.findOne({
    where: { user_id: userId, campaign_id: campaign.id },
    attributes: ['role'],
  })

  return {
    campaignId: String(campaign.id),
    membershipRole: membership?.role ?? null,
  }
}

const userHasDmRoleInWorld = async ({ worldId, userId }) => {
  const resolvedWorldId = normaliseId(worldId)
  const resolvedUserId = normaliseId(userId)

  if (!resolvedWorldId || !resolvedUserId) {
    return false
  }

  const membership = await UserCampaignRole.findOne({
    where: { user_id: resolvedUserId, role: 'dm' },
    attributes: ['id'],
    include: [
      {
        model: Campaign,
        as: 'campaign',
        required: true,
        attributes: ['id', 'world_id'],
        where: { world_id: resolvedWorldId },
      },
    ],
  })

  return Boolean(membership)
}

export const resolveEntityCreationAccess = async ({ world, user, campaignContextId }) => {
  const resolvedWorldId = normaliseId(world?.id)
  const userId = normaliseId(user?.id)
  const scope = normaliseEntityCreationScope(world?.entity_creation_scope)

  const baseResult = {
    allowed: false,
    defaultCampaignId: null,
    enforceCampaignScope: false,
    reason: 'You do not have permission to create entities in this world.',
  }

  if (!resolvedWorldId) {
    return { ...baseResult, reason: 'World context is required to create entities.' }
  }

  if (!userId) {
    return { ...baseResult, reason: 'Authentication required.' }
  }

  const isSystemAdmin = user?.role === 'system_admin'
  const worldOwnerId = normaliseId(world?.created_by ?? world?.createdBy)
  const isWorldOwner = Boolean(worldOwnerId && worldOwnerId === userId)

  const campaignMembership = await resolveCampaignMembership({
    worldId: resolvedWorldId,
    campaignContextId,
    userId,
  })

  if (isSystemAdmin || isWorldOwner) {
    return {
      allowed: true,
      defaultCampaignId: campaignMembership?.campaignId ?? null,
      enforceCampaignScope: false,
    }
  }

  const isWorldDm = await userHasDmRoleInWorld({ worldId: resolvedWorldId, userId })
  if (isWorldDm) {
    const defaultCampaignId =
      campaignMembership?.membershipRole === 'dm' ? campaignMembership.campaignId : null
    return {
      allowed: true,
      defaultCampaignId,
      enforceCampaignScope: false,
    }
  }

  if (scope !== 'all_players') {
    return baseResult
  }

  if (!campaignMembership?.campaignId) {
    return {
      ...baseResult,
      reason: 'Select a campaign before creating entities as a player.',
    }
  }

  if (!campaignMembership.membershipRole || campaignMembership.membershipRole === 'observer') {
    return {
      ...baseResult,
      reason: 'Only active campaign members can create entities in this world.',
    }
  }

  return {
    allowed: true,
    defaultCampaignId: campaignMembership.campaignId,
    enforceCampaignScope: true,
  }
}

const normaliseSecretAudienceIds = (value, fieldName) => {
  const baseValue = value === undefined ? [] : value
  const normalised = normaliseUuidArray(baseValue, fieldName)
  if (!Array.isArray(normalised)) return []
  return toUniqueStringList(normalised)
}

const SECRET_PERMISSION_INCLUDE = {
  model: EntitySecretPermission,
  as: 'permissions',
  attributes: ['id', 'user_id', 'campaign_id', 'can_view'],
  required: false,
  include: [
    {
      model: User,
      as: 'user',
      attributes: ['id', 'username', 'email'],
      required: false,
    },
    {
      model: Campaign,
      as: 'campaign',
      attributes: ['id', 'name'],
      required: false,
    },
  ],
}

const SECRET_CREATOR_INCLUDE = {
  association: 'creator',
  attributes: ['id', 'username', 'email'],
  required: false,
}

const fetchEntitySecretsForAccess = async ({
  entityId,
  worldId,
  user,
  canManageSecrets,
  campaignIds = [],
  isAdmin = false,
}) => {
  const isSystemAdmin = user?.role === 'system_admin'
  const secretQueryBase = {
    where: { entity_id: entityId },
    include: [SECRET_PERMISSION_INCLUDE, SECRET_CREATOR_INCLUDE],
    order: [['created_at', 'ASC']],
    distinct: true,
  }

  if (canManageSecrets) {
    return EntitySecret.findAll(secretQueryBase)
  }

  const visibilityClauses = []

  if (user?.id) {
    visibilityClauses.push({ created_by: user.id })
    visibilityClauses.push({
      '$permissions.user_id$': user.id,
      '$permissions.can_view$': true,
    })
  }

  let effectiveCampaignIds = Array.isArray(campaignIds)
    ? campaignIds.map((campaignId) => String(campaignId)).filter(Boolean)
    : []

  const allowAdminCampaignDerivation =
    !canManageSecrets && isAdmin && !isSystemAdmin && user?.id

  if (allowAdminCampaignDerivation && effectiveCampaignIds.length === 0) {
    const { campaignIds: derivedCampaignIds } = await fetchUserWorldCharacterCampaignIds(
      worldId,
      user.id,
    )
    effectiveCampaignIds = Array.from(derivedCampaignIds).map((campaignId) =>
      String(campaignId),
    )
  }

  if (effectiveCampaignIds.length > 0) {
    visibilityClauses.push({
      '$permissions.campaign_id$': { [Op.in]: effectiveCampaignIds },
      '$permissions.can_view$': true,
    })
  }

  if (visibilityClauses.length === 0) {
    return []
  }

  const secrets = await EntitySecret.findAll({
    ...secretQueryBase,
    where: {
      entity_id: entityId,
      [Op.or]: visibilityClauses,
    },
  })

  if (!Array.isArray(secrets) || secrets.length === 0) {
    return secrets
  }

  const userId = user?.id ? String(user.id) : null
  const campaignIdSet = new Set(effectiveCampaignIds.map((campaignId) => String(campaignId)))

  return secrets.filter((secret) => {
    const plain =
      typeof secret.get === 'function' ? secret.get({ plain: true }) : { ...secret }

    const creatorId = plain.created_by ?? plain.createdBy ?? plain.createdById ?? null
    if (userId && creatorId && String(creatorId) === userId) {
      return true
    }

    const permissions = Array.isArray(plain.permissions) ? plain.permissions : []

    return permissions.some((permission) => {
      if (permission?.can_view === false) {
        return false
      }

      const permUserId = permission.user_id ?? permission.user?.id ?? null
      if (userId && permUserId && String(permUserId) === userId) {
        return true
      }

      if (campaignIdSet.size === 0) {
        return false
      }

      const permCampaignId = permission.campaign_id ?? permission.campaign?.id ?? null
      if (permCampaignId && campaignIdSet.has(String(permCampaignId))) {
        return true
      }

      return false
    })
  })
}

const formatSecretRecord = (secret, includePermissions = false) => {
  if (!secret) return null
  const plain =
    typeof secret.get === 'function' ? secret.get({ plain: true }) : { ...secret }

  if (plain.creator) {
    const creator = plain.creator
    plain.creator = {
      id: creator.id,
      username: creator.username,
      email: creator.email,
    }
  }

  if (includePermissions) {
    plain.permissions = Array.isArray(plain.permissions)
      ? plain.permissions.map((permission) => {
          const permPlain =
            typeof permission.get === 'function'
              ? permission.get({ plain: true })
              : { ...permission }

          const payload = {
            id: permPlain.id,
            can_view: permPlain.can_view !== false,
          }

          if (permPlain.user_id) {
            payload.user_id = permPlain.user_id
          }
          if (permPlain.user) {
            payload.user = {
              id: permPlain.user.id,
              username: permPlain.user.username,
              email: permPlain.user.email,
            }
          }

          if (permPlain.campaign_id) {
            payload.campaign_id = permPlain.campaign_id
          }
          if (permPlain.campaign) {
            payload.campaign = {
              id: permPlain.campaign.id,
              name: permPlain.campaign.name,
            }
          }

          return payload
        })
      : []
  } else {
    delete plain.permissions
  }

  return plain
}

const FIELD_ORDER = [
  ['sort_order', 'ASC'],
  ['name', 'ASC'],
]

const fetchEntityTypeFields = async (entityTypeId) => {
  const records = await EntityTypeField.findAll({
    where: { entity_type_id: entityTypeId },
    order: FIELD_ORDER,
    include: [
      {
        model: EntityType,
        as: 'entityReferenceType',
        attributes: ['id', 'name'],
        required: false,
      },
      {
        model: LocationType,
        as: 'locationReferenceType',
        attributes: ['id', 'name'],
        required: false,
      },
    ],
  })
  return records.map((record) => {
    const plain = record.get({ plain: true })
    // Map both reference types to a single referenceType for backward compatibility
    const entityRef = plain.entityReferenceType
    const locationRef = plain.locationReferenceType
    if (entityRef) {
      plain.referenceType = entityRef
    } else if (locationRef) {
      plain.referenceType = locationRef
    }
    return plain
  })
}

const entityTypeFieldCache = new Map()

const getEntityTypeFieldsCached = async (entityTypeId) => {
  if (!entityTypeId) return []
  if (entityTypeFieldCache.has(entityTypeId)) {
    return entityTypeFieldCache.get(entityTypeId)
  }

  const fields = await fetchEntityTypeFields(entityTypeId)
  entityTypeFieldCache.set(entityTypeId, fields)
  return fields
}

const mapEntitiesWithDisplayMetadata = async (entities, campaignId = null) => {
  if (!Array.isArray(entities) || entities.length === 0) {
    return []
  }

  const labelCache = new Map()

  // Fetch all importance records in one query if campaign context exists
  let importanceMap = new Map()
  if (campaignId) {
    const entityIds = entities
      .map((e) => {
        const plain = e?.get ? e.get({ plain: true }) : e
        return plain?.id
      })
      .filter(Boolean)
    
    if (entityIds.length > 0) {
      const importanceRecords = await EntityCampaignImportance.findAll({
        where: {
          entity_id: { [Op.in]: entityIds },
          campaign_id: campaignId,
        },
      })
      importanceRecords.forEach((record) => {
        importanceMap.set(record.entity_id, record.importance)
      })
    }
  }

  const mapped = await Promise.all(
    entities.map(async (entity) => {
      const plain = entity?.get ? entity.get({ plain: true }) : entity
      if (!plain?.entity_type_id) {
        // Add importance even if no entity_type_id
        if (campaignId) {
          plain.importance = importanceMap.get(plain.id) || null
        } else {
          plain.importance = null
        }
        return plain
      }

      try {
        const fields = await getEntityTypeFieldsCached(plain.entity_type_id)
        if (!fields.length) {
          // Add importance even if no fields
          if (campaignId) {
            plain.importance = importanceMap.get(plain.id) || null
          } else {
            plain.importance = null
          }
          return plain
        }

        const metadataWithDisplayValues = await applyDisplayValuesToMetadata(
          plain.metadata,
          fields,
          labelCache,
        )

        const result = { ...plain, metadata: metadataWithDisplayValues }
        
        // Add importance
        if (campaignId) {
          result.importance = importanceMap.get(plain.id) || null
        } else {
          result.importance = null
        }
        
        return result
      } catch (err) {
        console.warn('⚠️ Failed to enrich entity metadata for display', err)
        // Add importance even on error
        if (campaignId) {
          plain.importance = importanceMap.get(plain.id) || null
        } else {
          plain.importance = null
        }
        return plain
      }
    }),
  )

  return mapped
}

const prepareEntityMetadata = async (entityTypeId, metadataSource, fieldsCache) => {
  const fields = fieldsCache ?? (await fetchEntityTypeFields(entityTypeId))
  const source = metadataSource ?? {}
  const metadataWithDefaults = applyFieldDefaults(fields, source)
  const metadataForValidation = { ...source, ...metadataWithDefaults }
  await validateEntityMetadata(entityTypeId, metadataForValidation, { EntityTypeField }, fields)
  return { metadata: metadataWithDefaults, fields }
}

const REFERENCE_FALLBACK_LABEL = 'Unknown'

const REFERENCE_ID_KEYS = ['id', 'value', 'entity_id', 'entityId', 'uuid']

const normaliseReferenceId = (value) => {
  if (value === null || value === undefined) return null
  const stringified = String(value).trim()
  return stringified || null
}

const extractReferenceId = (entry) => {
  if (entry === null || entry === undefined) return null

  if (Array.isArray(entry)) {
    for (const item of entry) {
      const id = extractReferenceId(item)
      if (id) return id
    }
    return null
  }

  if (typeof entry === 'object') {
    for (const key of REFERENCE_ID_KEYS) {
      if (entry[key] !== undefined && entry[key] !== null) {
        const id = normaliseReferenceId(entry[key])
        if (id) return id
      }
    }
    return null
  }

  if (typeof entry === 'string' || typeof entry === 'number' || typeof entry === 'bigint') {
    return normaliseReferenceId(entry)
  }

  return null
}

const collectReferenceIds = (value, accumulator) => {
  if (value === null || value === undefined) return
  if (Array.isArray(value)) {
    value.forEach((entry) => collectReferenceIds(entry, accumulator))
    return
  }

  const id = extractReferenceId(value)
  if (id) {
    accumulator.add(id)
  }
}

const resolveEntryLabel = (entry) => {
  if (!entry || typeof entry !== 'object') return null

  const candidates = [
    entry.displayValue,
    entry.display,
    entry.name,
    entry.title,
    entry.label,
    entry.value,
  ]

  for (const candidate of candidates) {
    if (candidate === null || candidate === undefined) continue
    const label = String(candidate).trim()
    if (label) return label
  }

  return null
}

const applyDisplayValueToEntry = (entry, labelMap, fallback) => {
  if (entry === null || entry === undefined) return entry
  if (Array.isArray(entry)) {
    return entry.map((item) => applyDisplayValueToEntry(item, labelMap, fallback))
  }

  const id = extractReferenceId(entry)
  if (!id) return entry

  const labelFromMap = labelMap[id]
  const existingLabel = resolveEntryLabel(entry)
  const resolvedLabel =
    existingLabel ??
    (labelFromMap !== null && labelFromMap !== undefined && String(labelFromMap).trim()
      ? String(labelFromMap).trim()
      : null) ??
    fallback

  const displayValue = resolvedLabel === null || resolvedLabel === undefined ? fallback : resolvedLabel

  if (typeof entry === 'object') {
    return { ...entry, id, displayValue }
  }

  return { id, displayValue }
}

const applyDisplayValuesToMetadata = async (metadata, fields, labelCache = new Map()) => {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return metadata
  }

  const referenceFields = Array.isArray(fields)
    ? fields.filter((field) => (field?.data_type ?? field?.dataType) === 'reference')
    : []

  if (!referenceFields.length) {
    return metadata
  }

  const referenceIds = new Set()

  referenceFields.forEach((field) => {
    const fieldName = field?.name
    if (!fieldName || !(fieldName in metadata)) return
    collectReferenceIds(metadata[fieldName], referenceIds)
  })

  if (!referenceIds.size) {
    return metadata
  }

  const lookupCache = labelCache instanceof Map ? labelCache : new Map()
  const missingIds = Array.from(referenceIds).filter((id) => !lookupCache.has(id))

  if (missingIds.length) {
    const records = await Entity.findAll({
      attributes: ['id', 'name'],
      where: { id: missingIds },
    })

    records.forEach((record) => {
      const plain = record?.get ? record.get({ plain: true }) : record
      if (!plain?.id) return
      const rawLabel = plain.name ?? null
      const label = rawLabel !== null && rawLabel !== undefined ? String(rawLabel).trim() : ''
      lookupCache.set(String(plain.id), label || null)
    })
  }

  const labelMap = {}
  referenceIds.forEach((id) => {
    if (!lookupCache.has(id)) return
    labelMap[id] = lookupCache.get(id)
  })

  const enriched = { ...metadata }

  referenceFields.forEach((field) => {
    const fieldName = field?.name
    if (!fieldName || !(fieldName in metadata)) return
    enriched[fieldName] = applyDisplayValueToEntry(
      metadata[fieldName],
      labelMap,
      REFERENCE_FALLBACK_LABEL
    )
  })

  return enriched
}

const resolveReferenceDisplayValue = (value) => {
  if (Array.isArray(value)) {
    const labels = value
      .map((item) => {
        if (!item || typeof item !== 'object') return null
        const label =
          item.displayValue ??
          item.display ??
          item.name ??
          item.title ??
          item.label ??
          item.value ??
          item.id ??
          null
        if (label === null || label === undefined) return null
        const trimmed = String(label).trim()
        return trimmed || null
      })
      .filter(Boolean)

    return labels.length ? labels.join(', ') : null
  }

  if (value && typeof value === 'object') {
    const label =
      value.displayValue ??
      value.display ??
      value.name ??
      value.title ??
      value.label ??
      value.value ??
      value.id ??
      null
    if (label === null || label === undefined) return null
    const trimmed = String(label).trim()
    return trimmed || null
  }

  return null
}

export const buildEntityPayload = async (entityInstance, fieldsCache, campaignId = null) => {
  const plain = entityInstance.get({ plain: true })

  if (plain.creator) {
    const creator = plain.creator
    plain.creator = {
      id: creator.id,
      username: creator.username,
      email: creator.email,
    }
  }
  const { metadata, fields } = await prepareEntityMetadata(
    plain.entity_type_id,
    plain.metadata,
    fieldsCache
  )

  const metadataWithDisplayValues = await applyDisplayValuesToMetadata(metadata, fields)

  plain.metadata = metadataWithDisplayValues
  plain.fields = fields.map((field) => {
    const fieldValue =
      metadataWithDisplayValues[field.name] !== undefined
        ? metadataWithDisplayValues[field.name]
        : null
    const isVisibleByDefault =
      field.visible_by_default !== undefined
        ? Boolean(field.visible_by_default)
        : field.visibleByDefault !== undefined
          ? Boolean(field.visibleByDefault)
          : true

    const entityRef = field.entityReferenceType
    const locationRef = field.locationReferenceType
    const referenceType = entityRef || locationRef
    
    return {
      id: field.id,
      name: field.name,
      label: field.label || field.name,
      dataType: field.data_type,
      required: field.required,
      options: field.options || {},
      referenceTypeId:
        field.reference_type_id ?? field.referenceTypeId ?? referenceType?.id ?? null,
      referenceTypeName:
        field.reference_type_name ?? field.referenceTypeName ?? referenceType?.name ?? '',
      referenceFilter:
        field.reference_filter ?? field.referenceFilter ?? field.referenceFilterJson ?? {},
      defaultValue:
        field.default_value !== undefined && field.default_value !== null
          ? coerceValueForField(field.default_value, field, { isDefault: true })
          : null,
      sortOrder: field.sort_order,
      value: fieldValue,
      displayValue:
        (field.data_type ?? field.dataType) === 'reference'
          ? resolveReferenceDisplayValue(fieldValue)
          : null,
      visibleByDefault: isVisibleByDefault,
      visible_by_default: isVisibleByDefault,
    }
  })

  // Add importance if campaign context exists
  if (campaignId) {
    const importanceRecord = await EntityCampaignImportance.findOne({
      where: {
        entity_id: plain.id,
        campaign_id: campaignId,
      },
    })
    plain.importance = importanceRecord?.importance || null
  } else {
    plain.importance = null
  }

  return plain
}

const normaliseMetadata = (metadata) => {
  if (metadata === undefined) return undefined
  if (metadata === null) return null
  if (typeof metadata !== 'object' || Array.isArray(metadata)) return null
  return metadata
}

export const createEntityResponse = async ({
  world,
  user,
  body,
  campaignContextId,
  creationAccess,
}) => {
  const {
    name,
    description,
    entity_type_id: entityTypeId,
    visibility,
    metadata,
    read_access: readAccessInput,
    write_access: writeAccessInput,
    read_campaign_ids: readCampaignIdsInput,
    read_user_ids: readUserIdsInput,
    read_character_ids: readCharacterIdsInput,
    write_campaign_ids: writeCampaignIdsInput,
    write_user_ids: writeUserIdsInput,
    image_data: imageDataInput,
    image_mime_type: imageMimeTypeInput,
  } = body ?? {}

  if (!name || !entityTypeId) {
    return {
      status: 400,
      body: { success: false, message: 'name and entity_type_id are required' },
    }
  }

  const entityType = await EntityType.findByPk(entityTypeId)
  if (!entityType) {
    return { status: 404, body: { success: false, message: 'Entity type not found' } }
  }

  if (!entityType.world_id) {
    return {
      status: 400,
      body: { success: false, message: 'Entity type is not assigned to a world' },
    }
  }

  if (String(entityType.world_id) !== String(world.id)) {
    return {
      status: 400,
      body: { success: false, message: 'Entity type belongs to a different world' },
    }
  }

  const resolvedVisibility = visibility ?? 'visible'
  if (!VISIBILITY_VALUES.has(resolvedVisibility)) {
    return { status: 400, body: { success: false, message: 'Invalid visibility value' } }
  }

  const creationAccessResult =
    creationAccess ??
    (await resolveEntityCreationAccess({ world, user, campaignContextId }))

  if (!creationAccessResult.allowed) {
    return {
      status: 403,
      body: {
        success: false,
        message: creationAccessResult.reason || 'You cannot create entities here.',
      },
    }
  }

  const defaultCampaignId = creationAccessResult.defaultCampaignId ?? null
  const enforceCampaignScope = Boolean(
    creationAccessResult.enforceCampaignScope && defaultCampaignId,
  )

  const defaultAccessMode = defaultCampaignId ? 'selective' : 'global'
  const defaultCampaignTargets = defaultCampaignId ? [defaultCampaignId] : []

  let readAccess = defaultAccessMode
  let writeAccess = defaultAccessMode
  let readCampaignIds = [...defaultCampaignTargets]
  let readUserIds = []
  let readCharacterIds = []
  let writeCampaignIds = [...defaultCampaignTargets]
  let writeUserIds = []
  let imageData
  let imageMimeType

  try {
    if (readAccessInput !== undefined) {
      readAccess = normaliseAccessValue(readAccessInput, 'read_access')
    }

    if (writeAccessInput !== undefined) {
      writeAccess = normaliseAccessValue(writeAccessInput, 'write_access')
    }

    if (readCampaignIdsInput !== undefined) {
      readCampaignIds = normaliseUuidArray(readCampaignIdsInput, 'read_campaign_ids')
    }

    if (readUserIdsInput !== undefined) {
      readUserIds = normaliseUuidArray(readUserIdsInput, 'read_user_ids')
    }

    if (readCharacterIdsInput !== undefined) {
      readCharacterIds = normaliseUuidArray(readCharacterIdsInput, 'read_character_ids')
    }

    if (writeCampaignIdsInput !== undefined) {
      writeCampaignIds = normaliseUuidArray(writeCampaignIdsInput, 'write_campaign_ids')
    }

    if (writeUserIdsInput !== undefined) {
      writeUserIds = normaliseUuidArray(writeUserIdsInput, 'write_user_ids')
    }

    imageData = normaliseImageDataInput(imageDataInput)
    imageMimeType = normaliseImageMimeTypeInput(imageMimeTypeInput)
  } catch (err) {
    return { status: 400, body: { success: false, message: err.message } }
  }

  if (readAccess !== 'selective') {
    readCampaignIds = []
    readUserIds = []
    readCharacterIds = []
  }

  if (writeAccess !== 'selective') {
    writeCampaignIds = []
    writeUserIds = []
  }

  if (enforceCampaignScope && defaultCampaignId) {
    readAccess = 'selective'
    writeAccess = 'selective'
    readCampaignIds = [defaultCampaignId]
    writeCampaignIds = [defaultCampaignId]
    readUserIds = []
    readCharacterIds = []
    writeUserIds = []
  }

  let metadataInput = {}
  if (metadata !== undefined) {
    const normalised = normaliseMetadata(metadata)
    if (normalised === null) {
      return {
        status: 400,
        body: { success: false, message: 'metadata must be an object' },
      }
    }
    metadataInput = normalised ?? {}
  }

  const { metadata: metadataToPersist, fields } = await prepareEntityMetadata(
    entityTypeId,
    metadataInput,
  )

  const entity = await Entity.create({
    name,
    description,
    world_id: world.id,
    entity_type_id: entityTypeId,
    visibility: resolvedVisibility,
    metadata: metadataToPersist,
    created_by: user.id,
    read_access: readAccess,
    write_access: writeAccess,
    read_campaign_ids: readCampaignIds,
    read_user_ids: readUserIds,
    read_character_ids: readCharacterIds,
    write_campaign_ids: writeCampaignIds,
    write_user_ids: writeUserIds,
    image_data: imageData ?? null,
    image_mime_type: imageMimeType ?? null,
  })

  const fullEntity = await Entity.findByPk(entity.id, {
    include: [
      { model: EntityType, as: 'entityType', attributes: ['id', 'name'] },
      { model: World, as: 'world', attributes: ['id', 'name', 'created_by'] },
      { association: 'creator', attributes: ['id', 'username', 'email'] },
    ],
  })

  const payload = await buildEntityPayload(fullEntity, fields, campaignContextId)

  return { status: 201, body: { success: true, data: payload } }
}

export const listWorldEntities = async (req, res) => {
  try {
    const { user, world } = req
    const access = req.worldAccess ?? (await checkWorldAccess(world.id, user))

    if (!access.hasAccess && !access.isOwner && !access.isAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    const viewAsCharacterId =
      typeof req.query?.viewAsCharacterId === 'string'
        ? req.query.viewAsCharacterId.trim()
        : typeof req.query?.characterId === 'string'
          ? req.query.characterId.trim()
          : ''

    const readContext = await buildEntityReadContext({
      worldId: world.id,
      user,
      worldAccess: access,
      campaignContextId: req.campaignContextId,
      characterContextId: viewAsCharacterId,
    })

    const where = { world_id: world.id }
    const isPrivilegedView = Boolean(readContext?.isOwner || readContext?.isAdmin)
    const allowPersonalAccess = Boolean(user?.id && !readContext?.suppressPersonalAccess)

    if (!isPrivilegedView) {
      const visibilityClauses = [{ visibility: { [Op.in]: PUBLIC_VISIBILITY } }]

      if (allowPersonalAccess) {
        visibilityClauses.push({ created_by: user.id })
      }

      if (visibilityClauses.length > 1) {
        where[Op.or] = visibilityClauses
      } else {
        where[Op.and] = [...(where[Op.and] ?? []), visibilityClauses[0]]
      }
    }

    const entities = await Entity.findAll({
      where,
      include: [
        { model: EntityType, as: 'entityType', attributes: ['id', 'name'] },
        { model: World, as: 'world', attributes: ['id', 'name'] },
      ],
      order: [['created_at', 'DESC']],
    })

    const filteredEntities = entities.filter((entity) => canUserReadEntity(entity, readContext))
    if (!filteredEntities.length) {
      return res.json({ success: true, data: [] })
    }

    const campaignId = req.campaignContextId || null
    
    // Filter by importance if requested and campaign context exists
    let importanceFiltered = filteredEntities
    const importanceFilter = req.query?.importance
    if (campaignId && importanceFilter) {
      const validImportanceValues = ['critical', 'important', 'medium']
      const filterValues = Array.isArray(importanceFilter)
        ? importanceFilter.filter((v) => v === null || v === 'null' || validImportanceValues.includes(v))
        : importanceFilter === null || importanceFilter === 'null' || validImportanceValues.includes(importanceFilter)
          ? [importanceFilter]
          : []
      
      if (filterValues.length > 0) {
        const entityIds = filteredEntities.map((e) => e.id)
        const hasNullFilter = filterValues.some((v) => v === null || v === 'null')
        const nonNullValues = filterValues.filter((v) => v !== null && v !== 'null')
        
        if (nonNullValues.length > 0) {
          const importanceRecords = await EntityCampaignImportance.findAll({
            where: {
              entity_id: { [Op.in]: entityIds },
              campaign_id: campaignId,
              importance: { [Op.in]: nonNullValues },
            },
          })
          const importantEntityIds = new Set(importanceRecords.map((r) => r.entity_id))
          
          if (hasNullFilter) {
            // Include entities with specified importance OR entities without importance set
            importanceFiltered = filteredEntities.filter(
              (e) => importantEntityIds.has(e.id) || !importantEntityIds.has(e.id)
            )
          } else {
            // Only include entities with specified importance
            importanceFiltered = filteredEntities.filter((e) => importantEntityIds.has(e.id))
          }
        } else if (hasNullFilter) {
          // Filter for entities without importance only
          const importanceRecords = await EntityCampaignImportance.findAll({
            where: {
              entity_id: { [Op.in]: entityIds },
              campaign_id: campaignId,
            },
          })
          const importantEntityIds = new Set(importanceRecords.map((r) => r.entity_id))
          importanceFiltered = filteredEntities.filter((e) => !importantEntityIds.has(e.id))
        }
      }
    }
    
    const payload = await mapEntitiesWithDisplayMetadata(importanceFiltered, campaignId)

    res.json({ success: true, data: payload })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const listUnassignedEntities = async (req, res) => {
  try {
    if (req.user?.role !== 'system_admin') {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    const entities = await Entity.findAll({
      where: { world_id: null },
      include: [
        { model: EntityType, as: 'entityType', attributes: ['id', 'name'] },
        { model: World, as: 'world', attributes: ['id', 'name'] },
      ],
      order: [['created_at', 'DESC']],
    })

    if (!entities.length) {
      return res.json({ success: true, data: [] })
    }

    // Unassigned entities don't have campaign context
    const payload = await mapEntitiesWithDisplayMetadata(entities, null)

    res.json({ success: true, data: payload })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

const normaliseIdList = (value) => {
  if (!value) return []
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (entry === undefined || entry === null) return ''
        return String(entry).trim()
      })
      .filter(Boolean)
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
  }

  return []
}

const clampNumber = (value, { min = 0, max = Number.MAX_SAFE_INTEGER, fallback = 0 } = {}) => {
  if (value === undefined || value === null || value === '') return fallback
  const parsed = Number(value)
  if (Number.isNaN(parsed)) return fallback
  if (parsed < min) return min
  if (parsed > max) return max
  return parsed
}

export const searchEntities = async (req, res) => {
  try {
    applyRelBuilderHeader(res)
    const { user } = req
    const { worldId, q = '', limit: rawLimit, offset: rawOffset, typeIds } = req.query

    if (!worldId) {
      return res.status(400).json({ success: false, message: 'worldId is required' })
    }

    const world = await World.findByPk(worldId)
    if (!world) {
      return res.status(404).json({ success: false, message: 'World not found' })
    }

    const access = req.worldAccess ?? (await checkWorldAccess(world.id, user))
    if (!access.hasAccess && !access.isOwner && !access.isAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    const readContext = await buildEntityReadContext({
      worldId: world.id,
      user,
      worldAccess: access,
      campaignContextId: req.campaignContextId,
    })

    const limit = clampNumber(rawLimit, { min: 1, max: 100, fallback: 20 })
    const offset = clampNumber(rawOffset, { min: 0, fallback: 0 })
    const trimmedQuery = typeof q === 'string' ? q.trim() : ''
    const where = { world_id: world.id }
    const isPrivilegedView = Boolean(readContext?.isOwner || readContext?.isAdmin)
    const allowPersonalAccess = Boolean(user?.id && !readContext?.suppressPersonalAccess)

    if (!isPrivilegedView) {
      const visibilityClauses = [{ visibility: { [Op.in]: PUBLIC_VISIBILITY } }]

      if (allowPersonalAccess) {
        visibilityClauses.push({ created_by: user.id })
      }

      if (visibilityClauses.length > 1) {
        where[Op.or] = visibilityClauses
      } else {
        where[Op.and] = [...(where[Op.and] ?? []), visibilityClauses[0]]
      }
    }

    const readAccessWhere = buildReadableEntitiesWhereClause(readContext)
    if (readAccessWhere) {
      if (where[Op.and]) {
        where[Op.and].push(readAccessWhere)
      } else {
        where[Op.and] = [readAccessWhere]
      }
    }

    if (trimmedQuery) {
      const pattern = `%${trimmedQuery}%`
      const dialect = Entity.sequelize?.getDialect?.() || ''
      if (dialect === 'postgres') {
        where.name = { [Op.iLike]: pattern }
      } else {
        where.name = { [Op.like]: pattern }
      }
    }

    const resolvedTypeIds = normaliseIdList(typeIds)
    if (resolvedTypeIds.length) {
      where.entity_type_id = { [Op.in]: resolvedTypeIds }
    }

    const { rows, count } = await Entity.findAndCountAll({
      where,
      include: [
        { model: EntityType, as: 'entityType', attributes: ['id', 'name'] },
      ],
      order: [['name', 'ASC']],
      distinct: true,
      limit,
      offset,
    })

    const payload = rows.map((entity) => {
      const plain = entity.get({ plain: true })
      const type = plain.entityType || {}
      return {
        id: plain.id,
        name: plain.name,
        typeId: type.id ?? plain.entity_type_id ?? null,
        typeName: type.name ?? plain.entity_type_name ?? null,
        image_data: plain.image_data ?? null,
        image_mime_type: plain.image_mime_type ?? null,
      }
    })

    const hasMore = offset + rows.length < count

    return res.json({
      success: true,
      data: payload,
      pagination: { total: count, limit, offset, hasMore },
    })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

export const globalSearch = async (req, res) => {
  try {
    applyRelBuilderHeader(res)
    const { user } = req
    const { q = '', campaignId, worldId, limit: rawLimit, offset: rawOffset } = req.query

    const trimmedQuery = typeof q === 'string' ? q.trim().toLowerCase() : ''
    if (!trimmedQuery) {
      return res.json({
        success: true,
        data: { entities: [], sessionNotes: [] },
        pagination: { total: 0, limit: 20, offset: 0, hasMore: false },
      })
    }

    const limit = clampNumber(rawLimit, { min: 1, max: 100, fallback: 20 })
    const offset = clampNumber(rawOffset, { min: 0, fallback: 0 })

    const results = {
      entities: [],
      sessionNotes: [],
    }

    // Search entities if worldId is provided
    if (worldId) {
      const world = await World.findByPk(worldId)
      if (!world) {
        return res.status(404).json({ success: false, message: 'World not found' })
      }

      const access = req.worldAccess ?? (await checkWorldAccess(world.id, user))
      // Allow search if user has any form of access (hasAccess, isOwner, isAdmin)
      // Also allow if they have campaign context (they might have access through campaign)
      const hasAnyAccess = access.hasAccess || access.isOwner || access.isAdmin
      
      // If no direct world access, check if they have campaign access to this world
      let hasCampaignAccess = false
      if (!hasAnyAccess && campaignId) {
        const { ensureCampaignAccess } = await import('../controllers/sessionNoteController.js')
        const campaignAccess = await ensureCampaignAccess(campaignId, user)
        if (!campaignAccess.error && campaignAccess.campaign?.world_id === worldId) {
          hasCampaignAccess = true
        }
      }
      
      if (!hasAnyAccess && !hasCampaignAccess) {
        return res.status(403).json({ success: false, message: 'Forbidden' })
      }

      const readContext = await buildEntityReadContext({
        worldId: world.id,
        user,
        worldAccess: access,
        campaignContextId: req.campaignContextId || campaignId,
      })

      const isPrivilegedView = Boolean(readContext?.isOwner || readContext?.isAdmin)
      const allowPersonalAccess = Boolean(user?.id && !readContext?.suppressPersonalAccess)

      // Base where clause for entities
      const entityWhere = { world_id: world.id }

      if (!isPrivilegedView) {
        const visibilityClauses = [{ visibility: { [Op.in]: PUBLIC_VISIBILITY } }]
        if (allowPersonalAccess) {
          visibilityClauses.push({ created_by: user.id })
        }
        if (visibilityClauses.length > 1) {
          entityWhere[Op.or] = visibilityClauses
        } else {
          entityWhere[Op.and] = [...(entityWhere[Op.and] ?? []), visibilityClauses[0]]
        }
      }

      const readAccessWhere = buildReadableEntitiesWhereClause(readContext)
      if (readAccessWhere) {
        if (entityWhere[Op.and]) {
          entityWhere[Op.and].push(readAccessWhere)
        } else {
          entityWhere[Op.and] = [readAccessWhere]
        }
      }

      // Search pattern
      const pattern = `%${trimmedQuery}%`
      const dialect = Entity.sequelize?.getDialect?.() || ''
      const likeOp = dialect === 'postgres' ? Op.iLike : Op.like

      // Find entities matching name (highest priority)
      const nameMatches = await Entity.findAll({
        where: {
          ...entityWhere,
          name: { [likeOp]: pattern },
        },
        include: [{ model: EntityType, as: 'entityType', attributes: ['id', 'name'] }],
        limit: 100,
      })

      // Find entities matching description
      const descriptionMatches = await Entity.findAll({
        where: {
          ...entityWhere,
          description: { [likeOp]: pattern },
          id: { [Op.notIn]: nameMatches.map((e) => e.id) },
        },
        include: [{ model: EntityType, as: 'entityType', attributes: ['id', 'name'] }],
        limit: 100,
      })

      // Find entities with matching notes
      const noteMatches = await EntityNote.findAll({
        where: {
          content: { [likeOp]: pattern },
        },
        include: [
          {
            model: Entity,
            as: 'entity',
            where: entityWhere,
            include: [{ model: EntityType, as: 'entityType', attributes: ['id', 'name'] }],
          },
        ],
        limit: 100,
      })

      const noteEntityIds = new Set(noteMatches.map((n) => n.entity_id))
      const alreadyFoundIds = new Set([
        ...nameMatches.map((e) => e.id),
        ...descriptionMatches.map((e) => e.id),
      ])

      // Find entities with matching mentions in notes
      // Get all entity notes with mentions and filter in memory
      const allEntityNotesWithMentions = await EntityNote.findAll({
        where: {
          [Op.and]: [
            sequelize.where(
              sequelize.fn('jsonb_array_length', sequelize.col('mentions')),
              { [Op.gt]: 0 },
            ),
          ],
        },
        include: [
          {
            model: Entity,
            as: 'entity',
            where: entityWhere,
            include: [{ model: EntityType, as: 'entityType', attributes: ['id', 'name'] }],
          },
        ],
        limit: 500,
      })

      const mentionEntityIds = new Set()
      allEntityNotesWithMentions.forEach((note) => {
        const mentions = note.mentions || []
        mentions.forEach((mention) => {
          const mentionName = (mention.name || '').toLowerCase()
          if (mentionName.includes(trimmedQuery)) {
            if (note.entity_id && !alreadyFoundIds.has(note.entity_id) && !noteEntityIds.has(note.entity_id)) {
              mentionEntityIds.add(note.entity_id)
            }
          }
        })
      })

      // Find entities with matching relationships
      // Get all relationships and filter context in memory
      const allRelationships = await EntityRelationship.findAll({
        include: [
          {
            model: Entity,
            as: 'from',
            where: entityWhere,
            include: [{ model: EntityType, as: 'entityType', attributes: ['id', 'name'] }],
            required: true,
          },
          {
            model: Entity,
            as: 'to',
            where: entityWhere,
            include: [{ model: EntityType, as: 'entityType', attributes: ['id', 'name'] }],
            required: true,
          },
        ],
        limit: 500,
      })

      const relationshipEntityIds = new Set()
      allRelationships.forEach((rel) => {
        const context = rel.context || {}
        const contextStr = JSON.stringify(context).toLowerCase()
        if (contextStr.includes(trimmedQuery)) {
          if (rel.from_entity && !alreadyFoundIds.has(rel.from_entity) && !noteEntityIds.has(rel.from_entity)) {
            relationshipEntityIds.add(rel.from_entity)
          }
          if (rel.to_entity && !alreadyFoundIds.has(rel.to_entity) && !noteEntityIds.has(rel.to_entity)) {
            relationshipEntityIds.add(rel.to_entity)
          }
        }
      })

      // Combine and deduplicate results with match type
      const entityMap = new Map()

      // Add name matches (priority 1)
      nameMatches.forEach((entity) => {
        const plain = entity.get({ plain: true })
        const type = plain.entityType || {}
        entityMap.set(plain.id, {
          id: plain.id,
          name: plain.name,
          typeId: type.id ?? plain.entity_type_id ?? null,
          typeName: type.name ?? plain.entity_type_name ?? null,
          image_data: plain.image_data ?? null,
          image_mime_type: plain.image_mime_type ?? null,
          matchType: 'name',
          priority: 1,
        })
      })

      // Add description matches (priority 2)
      descriptionMatches.forEach((entity) => {
        if (!entityMap.has(entity.id)) {
          const plain = entity.get({ plain: true })
          const type = plain.entityType || {}
          entityMap.set(plain.id, {
            id: plain.id,
            name: plain.name,
            typeId: type.id ?? plain.entity_type_id ?? null,
            typeName: type.name ?? plain.entity_type_name ?? null,
            image_data: plain.image_data ?? null,
            image_mime_type: plain.image_mime_type ?? null,
            matchType: 'description',
            priority: 2,
          })
        }
      })

      // Add note matches (priority 3)
      noteMatches.forEach((note) => {
        const entity = note.entity
        if (entity && !entityMap.has(entity.id)) {
          const plain = entity.get({ plain: true })
          const type = plain.entityType || {}
          entityMap.set(plain.id, {
            id: plain.id,
            name: plain.name,
            typeId: type.id ?? plain.entity_type_id ?? null,
            typeName: type.name ?? plain.entity_type_name ?? null,
            image_data: plain.image_data ?? null,
            image_mime_type: plain.image_mime_type ?? null,
            matchType: 'notes',
            priority: 3,
          })
        }
      })

      // Add mention matches (priority 4)
      if (mentionEntityIds.size > 0) {
        const mentionEntities = await Entity.findAll({
          where: {
            id: { [Op.in]: Array.from(mentionEntityIds) },
            ...entityWhere,
          },
          include: [{ model: EntityType, as: 'entityType', attributes: ['id', 'name'] }],
        })

        mentionEntities.forEach((entity) => {
          if (!entityMap.has(entity.id)) {
            const plain = entity.get({ plain: true })
            const type = plain.entityType || {}
            entityMap.set(plain.id, {
              id: plain.id,
              name: plain.name,
              typeId: type.id ?? plain.entity_type_id ?? null,
              typeName: type.name ?? plain.entity_type_name ?? null,
              image_data: plain.image_data ?? null,
              image_mime_type: plain.image_mime_type ?? null,
              matchType: 'mentions',
              priority: 4,
            })
          }
        })
      }

      // Add relationship matches (priority 5)
      if (relationshipEntityIds.size > 0) {
        const relationshipEntities = await Entity.findAll({
          where: {
            id: { [Op.in]: Array.from(relationshipEntityIds) },
            ...entityWhere,
          },
          include: [{ model: EntityType, as: 'entityType', attributes: ['id', 'name'] }],
        })

        relationshipEntities.forEach((entity) => {
          if (!entityMap.has(entity.id)) {
            const plain = entity.get({ plain: true })
            const type = plain.entityType || {}
            entityMap.set(plain.id, {
              id: plain.id,
              name: plain.name,
              typeId: type.id ?? plain.entity_type_id ?? null,
              typeName: type.name ?? plain.entity_type_name ?? null,
              image_data: plain.image_data ?? null,
              image_mime_type: plain.image_mime_type ?? null,
              matchType: 'relationships',
              priority: 5,
            })
          }
        })
      }

      // Sort by priority and convert to array
      results.entities = Array.from(entityMap.values())
        .sort((a, b) => a.priority - b.priority)
        .slice(offset, offset + limit)
    }

    // Search session notes if campaignId is provided
    if (campaignId) {
      const { ensureCampaignAccess } = await import('../controllers/sessionNoteController.js')
      const access = await ensureCampaignAccess(campaignId, user)
      
      if (access.error) {
        return res.status(access.error.status).json({
          success: false,
          message: access.error.message,
        })
      }

      const campaign = access.campaign

      const pattern = `%${trimmedQuery}%`
      const dialect = SessionNote.sequelize?.getDialect?.() || ''
      const likeOp = dialect === 'postgres' ? Op.iLike : Op.like

      // Search session notes by title
      const titleMatches = await SessionNote.findAll({
        where: {
          campaign_id: campaignId,
          session_title: { [likeOp]: pattern },
        },
        include: [
          { model: User, as: 'author', attributes: ['id', 'username', 'email'] },
          { model: User, as: 'lastEditor', attributes: ['id', 'username', 'email'] },
        ],
        limit: 50,
        order: [['session_date', 'DESC']],
      })

      // Search session notes by content
      const contentMatches = await SessionNote.findAll({
        where: {
          campaign_id: campaignId,
          content: { [likeOp]: pattern },
          id: { [Op.notIn]: titleMatches.map((n) => n.id) },
        },
        include: [
          { model: User, as: 'author', attributes: ['id', 'username', 'email'] },
          { model: User, as: 'lastEditor', attributes: ['id', 'username', 'email'] },
        ],
        limit: 50,
        order: [['session_date', 'DESC']],
      })

      // Search session notes by mentions
      // Get all session notes with mentions and filter in memory
      const allSessionNotes = await SessionNote.findAll({
        where: {
          campaign_id: campaignId,
          [Op.and]: [
            sequelize.where(
              sequelize.fn('jsonb_array_length', sequelize.col('mentions')),
              { [Op.gt]: 0 },
            ),
          ],
        },
        include: [
          { model: User, as: 'author', attributes: ['id', 'username', 'email'] },
          { model: User, as: 'lastEditor', attributes: ['id', 'username', 'email'] },
        ],
        limit: 500,
      })

      const noteMap = new Map()

      // Add title matches (priority 1)
      titleMatches.forEach((note) => {
        const plain = note.get({ plain: true })
        noteMap.set(plain.id, {
          id: plain.id,
          session_title: plain.session_title,
          session_date: plain.session_date,
          content: plain.content,
          mentions: plain.mentions || [],
          author: plain.author,
          lastEditor: plain.lastEditor,
          matchType: 'title',
          priority: 1,
        })
      })

      // Add content matches (priority 2)
      contentMatches.forEach((note) => {
        if (!noteMap.has(note.id)) {
          const plain = note.get({ plain: true })
          noteMap.set(plain.id, {
            id: plain.id,
            session_title: plain.session_title,
            session_date: plain.session_date,
            content: plain.content,
            mentions: plain.mentions || [],
            author: plain.author,
            lastEditor: plain.lastEditor,
            matchType: 'content',
            priority: 2,
          })
        }
      })

      // Add mention matches (priority 3)
      allSessionNotes.forEach((note) => {
        if (!noteMap.has(note.id)) {
          const mentions = note.mentions || []
          const hasMatchingMention = mentions.some((mention) => {
            const mentionName = (mention.name || '').toLowerCase()
            return mentionName.includes(trimmedQuery)
          })
          if (hasMatchingMention) {
            const plain = note.get({ plain: true })
            noteMap.set(plain.id, {
              id: plain.id,
              session_title: plain.session_title,
              session_date: plain.session_date,
              content: plain.content,
              mentions: plain.mentions || [],
              author: plain.author,
              lastEditor: plain.lastEditor,
              matchType: 'mentions',
              priority: 3,
            })
          }
        }
      })

      results.sessionNotes = Array.from(noteMap.values())
        .sort((a, b) => {
          // Sort by priority first, then by date
          if (a.priority !== b.priority) {
            return a.priority - b.priority
          }
          return new Date(b.session_date) - new Date(a.session_date)
        })
        .slice(offset, offset + limit)
    }

    const totalEntities = results.entities.length
    const totalSessionNotes = results.sessionNotes.length
    const total = totalEntities + totalSessionNotes

    return res.json({
      success: true,
      data: results,
      pagination: {
        total,
        limit,
        offset,
        hasMore: total > offset + limit,
      },
    })
  } catch (error) {
    console.error('❌ Global search failed:', error)
    return res.status(500).json({ success: false, message: error.message })
  }
}

export const createWorldEntity = async (req, res) => {
  try {
    applyRelBuilderHeader(res)
    const { world, user } = req
    const access = req.worldAccess ?? (await checkWorldAccess(world.id, user))

    if (!access.hasAccess && !access.isOwner && !access.isAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    const result = await createEntityResponse({
      world,
      user,
      body: req.body,
      campaignContextId: req.campaignContextId,
    })

    return res.status(result.status).json(result.body)
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const createEntity = async (req, res) => {
  try {
    applyRelBuilderHeader(res)
    const { user } = req
    const { world_id: worldId } = req.body ?? {}

    if (!worldId) {
      return res.status(400).json({ success: false, message: 'world_id is required' })
    }

    const world = await World.findByPk(worldId)
    if (!world) {
      return res.status(404).json({ success: false, message: 'World not found' })
    }

    const access = await checkWorldAccess(worldId, user)

    if (!access.hasAccess && !access.isOwner && !access.isAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    const result = await createEntityResponse({
      world,
      user,
      body: req.body,
      campaignContextId: req.campaignContextId,
    })

    return res.status(result.status).json(result.body)
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const updateEntity = async (req, res) => {
  try {
    const { id } = req.params
    const {
      name,
      description,
      visibility,
      metadata,
      read_access: readAccessInput,
      write_access: writeAccessInput,
      read_campaign_ids: readCampaignIdsInput,
      read_user_ids: readUserIdsInput,
      read_character_ids: readCharacterIdsInput,
      write_campaign_ids: writeCampaignIdsInput,
      write_user_ids: writeUserIdsInput,
      image_data: imageDataInput,
      image_mime_type: imageMimeTypeInput,
      location_id: locationIdInput,
    } = req.body
    const { user } = req

    const entity = await Entity.findByPk(id, {
      include: [
        { model: EntityType, as: 'entityType', attributes: ['id', 'name'] },
        { model: World, as: 'world', attributes: ['id', 'name', 'created_by'] },
      ],
    })

    if (!entity) {
      return res.status(404).json({ success: false, message: 'Entity not found' })
    }

    const access = await checkWorldAccess(entity.world_id, user)

    if (!access.world) {
      return res.status(404).json({ success: false, message: 'World not found' })
    }

    const readContext = await buildEntityReadContext({
      worldId: entity.world_id,
      user,
      worldAccess: access,
      campaignContextId: req.campaignContextId,
    })

    if (!canUserWriteEntity(entity, readContext)) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    let readAccess
    let writeAccess
    let readCampaignIds
    let readUserIds
    let readCharacterIds
    let writeCampaignIds
    let writeUserIds
    let imageData
    let imageMimeType

    try {
      readAccess = normaliseAccessValue(readAccessInput, 'read_access')
      writeAccess = normaliseAccessValue(writeAccessInput, 'write_access')
      readCampaignIds = normaliseUuidArray(readCampaignIdsInput, 'read_campaign_ids')
      readUserIds = normaliseUuidArray(readUserIdsInput, 'read_user_ids')
      readCharacterIds = normaliseUuidArray(readCharacterIdsInput, 'read_character_ids')
      writeCampaignIds = normaliseUuidArray(writeCampaignIdsInput, 'write_campaign_ids')
      writeUserIds = normaliseUuidArray(writeUserIdsInput, 'write_user_ids')
      imageData = normaliseImageDataInput(imageDataInput)
      imageMimeType = normaliseImageMimeTypeInput(imageMimeTypeInput)
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message })
    }

    const updates = {}

    if (name !== undefined) {
      if (!name) {
        return res.status(400).json({ success: false, message: 'name cannot be empty' })
      }
      updates.name = name
    }

    if (description !== undefined) {
      updates.description = description
    }

    if (visibility !== undefined) {
      if (!VISIBILITY_VALUES.has(visibility)) {
        return res.status(400).json({ success: false, message: 'Invalid visibility value' })
      }
      updates.visibility = visibility
    }

    if (readAccess !== undefined) {
      updates.read_access = readAccess
      if (readAccess !== 'selective') {
        readCampaignIds = []
        readUserIds = []
        readCharacterIds = []
      }
    }

    if (writeAccess !== undefined) {
      updates.write_access = writeAccess
      if (writeAccess !== 'selective') {
        writeCampaignIds = []
        writeUserIds = []
      }
    }

    if (readCampaignIds !== undefined) {
      updates.read_campaign_ids = readCampaignIds
    }

    if (readUserIds !== undefined) {
      updates.read_user_ids = readUserIds
    }

    if (readCharacterIds !== undefined) {
      updates.read_character_ids = readCharacterIds
    }

    if (writeCampaignIds !== undefined) {
      updates.write_campaign_ids = writeCampaignIds
    }

    if (writeUserIds !== undefined) {
      updates.write_user_ids = writeUserIds
    }

    if (locationIdInput !== undefined) {
      const locationId = normaliseId(locationIdInput)
      if (locationId) {
        // Validate that the location exists and belongs to the same world
        const location = await Location.findByPk(locationId)
        if (!location) {
          return res.status(404).json({ success: false, message: 'Location not found' })
        }
        if (location.world_id !== entity.world_id) {
          return res.status(400).json({ success: false, message: 'Location does not belong to the same world as the entity' })
        }
      }
      updates.location_id = locationId || null
    }

    if (imageData !== undefined) {
      updates.image_data = imageData
      if (imageData === null && imageMimeType === undefined) {
        updates.image_mime_type = null
      }
    }

    if (imageMimeType !== undefined) {
      updates.image_mime_type = imageMimeType
    }

    const existingMetadata = entity.metadata ?? {}
    let metadataSource = { ...existingMetadata }

    if (metadata !== undefined) {
      const normalised = normaliseMetadata(metadata)
      if (normalised === null) {
        return res.status(400).json({ success: false, message: 'metadata must be an object' })
      }
      metadataSource = { ...metadataSource, ...normalised }
    }

    const { metadata: metadataToPersist, fields } = await prepareEntityMetadata(
      entity.entity_type_id,
      metadataSource
    )

    updates.metadata = metadataToPersist

    await entity.update(updates)
    await entity.reload({
      include: [
        { model: EntityType, as: 'entityType', attributes: ['id', 'name'] },
        { model: World, as: 'world', attributes: ['id', 'name', 'created_by'] },
        { association: 'creator', attributes: ['id', 'username', 'email'] },
        { model: Location, as: 'location', attributes: ['id', 'name'], required: false },
      ],
    })

    const campaignId = req.campaignContextId || null
    const payload = await buildEntityPayload(entity, fields, campaignId)

    res.json({ success: true, data: payload })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const deleteEntity = async (req, res) => {
  try {
    const { id } = req.params
    const { user } = req

    const entity = await Entity.findByPk(id)

    if (!entity) {
      return res.status(404).json({ success: false, message: 'Entity not found' })
    }

    const access = await checkWorldAccess(entity.world_id, user)
    const isCreator = isEntityCreator(entity, user)

    if (!access.world) {
      return res.status(404).json({ success: false, message: 'World not found' })
    }

    if (!access.isOwner && !access.isAdmin && !isCreator) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    // Delete related bulk_update_changes records before deleting the entity
    // This is necessary because the foreign key constraint may not have CASCADE delete enabled
    // Use a transaction to ensure both operations succeed or fail together
    await sequelize.transaction(async (transaction) => {
      // Delete related bulk_update_changes records first
      await BulkUpdateChange.destroy({
        where: { entity_id: id },
        transaction,
      })

      // Then delete the entity
      await entity.destroy({ transaction })
    })

    return res.json({ success: true, message: 'Entity deleted' })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

export const getEntityById = async (req, res) => {
  try {
    const { user } = req
    const { id } = req.params

    const entity = await Entity.findByPk(id, {
      include: [
        { model: EntityType, as: 'entityType', attributes: ['id', 'name'] },
        { model: World, as: 'world', attributes: ['id', 'name'] },
        { association: 'creator', attributes: ['id', 'username', 'email'] },
        { model: Location, as: 'location', attributes: ['id', 'name'], required: false },
      ],
    })

    if (!entity) {
      return res.status(404).json({ success: false, message: 'Entity not found' })
    }

    const access = await checkWorldAccess(entity.world_id, user)
    const isCreator = isEntityCreator(entity, user)

    if (!access.world) {
      return res.status(404).json({ success: false, message: 'World not found' })
    }

    const readContext = await buildEntityReadContext({
      worldId: entity.world_id,
      user,
      worldAccess: access,
      campaignContextId: req.campaignContextId,
    })

    if (!canUserReadEntity(entity, readContext)) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    const canEdit = canUserWriteEntity(entity, readContext)
    const canSeeHidden = access.isOwner || access.isAdmin || isCreator || canEdit
    if (!canSeeHidden && entity.visibility === 'hidden') {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    const canManageSecrets = access.isOwner
    const campaignIds = Array.from(readContext?.campaignIds ?? [])

    const secrets = await fetchEntitySecretsForAccess({
      entityId: entity.id,
      worldId: entity.world_id,
      user,
      canManageSecrets,
      campaignIds,
      isAdmin: access.isAdmin,
    })

    const campaignId = req.campaignContextId || null
    const payload = await buildEntityPayload(entity, null, campaignId)
    payload.secrets = secrets.map((secret) =>
      formatSecretRecord(secret, canManageSecrets)
    )

    const canDelete = access.isOwner || access.isAdmin || isCreator
    payload.permissions = {
      canEdit,
      canDelete,
      canManageSecrets,
    }
    payload.access = {
      isOwner: access.isOwner,
      isAdmin: access.isAdmin,
      isCreator,
      hasAccess: access.hasAccess,
    }

    res.json({ success: true, data: payload })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const updateEntityImportance = async (req, res) => {
  try {
    const { id } = req.params
    const { importance } = req.body
    const { user } = req
    const campaignId = req.campaignContextId

    if (!campaignId) {
      return res.status(400).json({
        success: false,
        message: 'Campaign context is required to set entity importance',
      })
    }

    // Validate importance value
    const validImportanceValues = ['critical', 'important', 'medium', null]
    if (importance !== null && importance !== undefined && !validImportanceValues.includes(importance)) {
      return res.status(400).json({
        success: false,
        message: 'importance must be one of: critical, important, medium, or null',
      })
    }

    const entity = await Entity.findByPk(id, {
      include: [
        { model: EntityType, as: 'entityType', attributes: ['id', 'name'] },
        { model: World, as: 'world', attributes: ['id', 'name', 'created_by'] },
      ],
    })

    if (!entity) {
      return res.status(404).json({ success: false, message: 'Entity not found' })
    }

    const access = await checkWorldAccess(entity.world_id, user)

    if (!access.world) {
      return res.status(404).json({ success: false, message: 'World not found' })
    }

    const readContext = await buildEntityReadContext({
      worldId: entity.world_id,
      user,
      worldAccess: access,
      campaignContextId: campaignId,
    })

    if (!canUserWriteEntity(entity, readContext)) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    // Verify campaign exists and user has access
    const campaign = await Campaign.findByPk(campaignId)
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' })
    }

    if (campaign.world_id !== entity.world_id) {
      return res.status(400).json({
        success: false,
        message: 'Campaign does not belong to the same world as the entity',
      })
    }

    // Upsert importance record
    const [importanceRecord, created] = await EntityCampaignImportance.findOrCreate({
      where: {
        entity_id: id,
        campaign_id: campaignId,
      },
      defaults: {
        entity_id: id,
        campaign_id: campaignId,
        importance: importance || null,
      },
    })

    if (!created) {
      if (importance === null || importance === undefined) {
        // Delete the record if setting to null
        await importanceRecord.destroy()
      } else {
        // Update existing record
        await importanceRecord.update({ importance })
      }
    }

    // Reload entity and return updated payload
    await entity.reload({
      include: [
        { model: EntityType, as: 'entityType', attributes: ['id', 'name'] },
        { model: World, as: 'world', attributes: ['id', 'name', 'created_by'] },
        { association: 'creator', attributes: ['id', 'username', 'email'] },
      ],
    })

    const fields = await getEntityTypeFieldsCached(entity.entity_type_id)
    const payload = await buildEntityPayload(entity, fields, campaignId)

    res.json({ success: true, data: payload })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const getEntitySecrets = async (req, res) => {
  try {
    const { user } = req
    const { id } = req.params

    const entity = await Entity.findByPk(id)
    if (!entity) {
      return res.status(404).json({ success: false, message: 'Entity not found' })
    }

    const access = await checkWorldAccess(entity.world_id, user)
    if (!access.world) {
      return res.status(404).json({ success: false, message: 'World not found' })
    }

    if (!access.isOwner) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    const readContext = await buildEntityReadContext({
      worldId: entity.world_id,
      user,
      worldAccess: access,
      campaignContextId: req.campaignContextId,
    })

    const canManageSecrets = access.isOwner
    const campaignIds = Array.from(readContext?.campaignIds ?? [])

    const secrets = await fetchEntitySecretsForAccess({
      entityId: entity.id,
      worldId: entity.world_id,
      user,
      canManageSecrets,
      campaignIds,
      isAdmin: access.isAdmin,
    })

    res.json({
      success: true,
      data: secrets.map((secret) => formatSecretRecord(secret, canManageSecrets)),
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const createEntitySecret = async (req, res) => {
  try {
    const { user } = req
    const { id } = req.params
    const {
      title,
      summary,
      content,
      description,
      user_ids: userIdsInput,
      userIds: userIdsAlt,
      campaign_ids: campaignIdsInput,
      campaignIds: campaignIdsAlt,
    } = req.body || {}

    const resolvedContent = (description ?? content ?? '').trim()
    if (!resolvedContent) {
      return res
        .status(400)
        .json({ success: false, message: 'content is required' })
    }

    const resolvedTitle = summary ?? title ?? ''

    const entity = await Entity.findByPk(id)
    if (!entity) {
      return res.status(404).json({ success: false, message: 'Entity not found' })
    }

    const access = await checkWorldAccess(entity.world_id, user)
    if (!access.world) {
      return res.status(404).json({ success: false, message: 'World not found' })
    }

    if (!access.isOwner && !access.isAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    let userIds = []
    let campaignIds = []
    try {
      userIds = normaliseSecretAudienceIds(
        userIdsInput !== undefined ? userIdsInput : userIdsAlt,
        'user_ids'
      )
      campaignIds = normaliseSecretAudienceIds(
        campaignIdsInput !== undefined ? campaignIdsInput : campaignIdsAlt,
        'campaign_ids'
      )
    } catch (validationError) {
      return res
        .status(400)
        .json({ success: false, message: validationError.message })
    }

    const transaction = await sequelize.transaction()

    try {
      const secret = await EntitySecret.create(
        {
          entity_id: entity.id,
          created_by: user.id,
          title: resolvedTitle,
          content: resolvedContent,
        },
        { transaction }
      )

      const permissionPayload = []
      userIds.forEach((userId) => {
        permissionPayload.push({
          secret_id: secret.id,
          user_id: userId,
          can_view: true,
        })
      })
      campaignIds.forEach((campaignId) => {
        permissionPayload.push({
          secret_id: secret.id,
          campaign_id: campaignId,
          can_view: true,
        })
      })

      if (permissionPayload.length > 0) {
        await EntitySecretPermission.bulkCreate(permissionPayload, {
          ignoreDuplicates: true,
          transaction,
        })
      }

      const payload = await EntitySecret.findByPk(secret.id, {
        include: [SECRET_PERMISSION_INCLUDE, SECRET_CREATOR_INCLUDE],
        transaction,
      })

      await transaction.commit()

      res.status(201).json({
        success: true,
        data: formatSecretRecord(payload, true),
      })
    } catch (creationError) {
      await transaction.rollback()
      throw creationError
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const updateEntitySecret = async (req, res) => {
  try {
    const { user } = req
    const { id, secretId } = req.params
    const {
      title,
      summary,
      content,
      description,
      user_ids: userIdsInput,
      userIds: userIdsAlt,
      campaign_ids: campaignIdsInput,
      campaignIds: campaignIdsAlt,
    } = req.body || {}

    const entity = await Entity.findByPk(id)
    if (!entity) {
      return res.status(404).json({ success: false, message: 'Entity not found' })
    }

    const access = await checkWorldAccess(entity.world_id, user)
    if (!access.world) {
      return res.status(404).json({ success: false, message: 'World not found' })
    }

    const secret = await EntitySecret.findByPk(secretId)
    if (!secret || String(secret.entity_id) !== String(entity.id)) {
      return res.status(404).json({ success: false, message: 'Secret not found' })
    }

    const isSecretCreator = secret.created_by === user?.id
    const canManageSecret = access.isOwner || isSecretCreator

    if (!canManageSecret) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    const canModifyAudience = access.isOwner

    const secretUpdates = {}
    const resolvedTitle = summary ?? title
    if (resolvedTitle !== undefined) {
      secretUpdates.title = String(resolvedTitle).trim()
    }

    const contentInput = description ?? content
    if (contentInput !== undefined) {
      const trimmed = String(contentInput).trim()
      if (!trimmed) {
        return res.status(400).json({ success: false, message: 'content is required' })
      }
      secretUpdates.content = trimmed
    }

    const hasUserIdsInput = userIdsInput !== undefined || userIdsAlt !== undefined
    const hasCampaignIdsInput = campaignIdsInput !== undefined || campaignIdsAlt !== undefined

    if (!canModifyAudience && (hasUserIdsInput || hasCampaignIdsInput)) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    let userIds = []
    let campaignIds = []

    try {
      if (hasUserIdsInput) {
        userIds = normaliseSecretAudienceIds(
          userIdsInput !== undefined ? userIdsInput : userIdsAlt,
          'user_ids',
        )
      }

      if (hasCampaignIdsInput) {
        campaignIds = normaliseSecretAudienceIds(
          campaignIdsInput !== undefined ? campaignIdsInput : campaignIdsAlt,
          'campaign_ids',
        )
      }
    } catch (validationError) {
      return res
        .status(400)
        .json({ success: false, message: validationError.message })
    }

    if (
      Object.keys(secretUpdates).length === 0 &&
      !hasUserIdsInput &&
      !hasCampaignIdsInput
    ) {
      const payload = await EntitySecret.findByPk(secret.id, {
        include: [SECRET_PERMISSION_INCLUDE, SECRET_CREATOR_INCLUDE],
      })

      return res.json({
        success: true,
        data: formatSecretRecord(payload, access.isOwner),
      })
    }

    const transaction = await sequelize.transaction()

    try {
      if (Object.keys(secretUpdates).length > 0) {
        await secret.update(secretUpdates, { transaction })
      }

      const permissionPayload = []

      if (hasUserIdsInput) {
        if (userIds.length > 0) {
          await EntitySecretPermission.destroy({
            where: {
              secret_id: secret.id,
              user_id: { [Op.notIn]: userIds },
              campaign_id: null,
            },
            transaction,
          })
        } else {
          await EntitySecretPermission.destroy({
            where: {
              secret_id: secret.id,
              user_id: { [Op.ne]: null },
              campaign_id: null,
            },
            transaction,
          })
        }

        userIds.forEach((userId) => {
          permissionPayload.push({
            secret_id: secret.id,
            user_id: userId,
            campaign_id: null,
            can_view: true,
          })
        })
      }

      if (hasCampaignIdsInput) {
        if (campaignIds.length > 0) {
          await EntitySecretPermission.destroy({
            where: {
              secret_id: secret.id,
              campaign_id: { [Op.notIn]: campaignIds },
              user_id: null,
            },
            transaction,
          })
        } else {
          await EntitySecretPermission.destroy({
            where: {
              secret_id: secret.id,
              campaign_id: { [Op.ne]: null },
              user_id: null,
            },
            transaction,
          })
        }

        campaignIds.forEach((campaignId) => {
          permissionPayload.push({
            secret_id: secret.id,
            campaign_id: campaignId,
            user_id: null,
            can_view: true,
          })
        })
      }

      if (permissionPayload.length > 0) {
        await EntitySecretPermission.bulkCreate(permissionPayload, {
          ignoreDuplicates: true,
          updateOnDuplicate: ['can_view', 'updated_at'],
          transaction,
        })
      }

      await transaction.commit()
    } catch (updateError) {
      await transaction.rollback()
      throw updateError
    }

    const payload = await EntitySecret.findByPk(secret.id, {
      include: [SECRET_PERMISSION_INCLUDE, SECRET_CREATOR_INCLUDE],
    })

    return res.json({
      success: true,
      data: formatSecretRecord(payload, access.isOwner),
    })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}
