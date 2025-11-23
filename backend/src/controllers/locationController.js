// src/controllers/locationController.js
import { Op } from 'sequelize'
import {
  Location,
  LocationType,
  LocationTypeField,
  World,
  User,
  Entity,
  EntityType,
  LocationCampaignImportance,
  Campaign,
  sequelize,
} from '../models/index.js'
import { checkWorldAccess } from '../middleware/worldAccess.js'
import {
  buildLocationReadContext,
  canUserReadLocation,
  buildReadableLocationsWhereClause,
} from '../utils/locationAccess.js'
import { resolveEntityCreationAccess } from './entityController.js'

const PUBLIC_VISIBILITY = ['visible', 'partial']

const isSystemAdmin = (user) => user?.role === 'system_admin'

const normaliseId = (value) => {
  if (!value) return null
  const trimmed = String(value).trim()
  return trimmed || null
}

// Get all locations for a world
export const getLocations = async (req, res) => {
  try {
    const { worldId } = req.query
    const worldIdParam = normaliseId(worldId || req.params.worldId)

    if (!worldIdParam) {
      return res.status(400).json({ success: false, message: 'worldId is required' })
    }

    const access = await checkWorldAccess(worldIdParam, req.user)
    if (!access.world) {
      return res.status(404).json({ success: false, message: 'World not found' })
    }

    if (!access.hasAccess && !access.isOwner && !access.isAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    const viewAsCharacterId =
      typeof req.query?.viewAsCharacterId === 'string'
        ? req.query.viewAsCharacterId.trim()
        : typeof req.query?.characterId === 'string'
          ? req.query.characterId.trim()
          : ''

    const readContext = await buildLocationReadContext({
      worldId: worldIdParam,
      user: req.user,
      worldAccess: access,
      campaignContextId: req.campaignContextId,
      characterContextId: viewAsCharacterId,
    })

    const { parentId, locationTypeId, includeEntities, all } = req.query

    const where = {
      world_id: worldIdParam,
    }

    // Handle parentId: if explicitly provided (even as 'null'), use it
    // If not provided at all and no locationTypeId filter and all is not true, default to root locations (parent_id is null)
    // If locationTypeId is provided or all is true, don't filter by parent unless explicitly requested
    if (parentId !== undefined) {
      if (parentId === null || parentId === 'null' || parentId === '') {
        where.parent_id = null
      } else {
        const normalisedParentId = normaliseId(parentId)
        if (normalisedParentId) {
          where.parent_id = normalisedParentId
        }
      }
    } else if (!locationTypeId && all !== 'true') {
      // Default to root locations when parentId is not specified AND no type filter AND all is not true
      where.parent_id = null
    }

    if (locationTypeId) {
      where.location_type_id = normaliseId(locationTypeId)
    }

    // Apply visibility and access filtering
    const isPrivilegedView = Boolean(readContext?.isOwner || readContext?.isAdmin)
    const allowPersonalAccess = Boolean(req.user?.id && !readContext?.suppressPersonalAccess)

    if (!isPrivilegedView) {
      const visibilityClauses = [{ visibility: { [Op.in]: PUBLIC_VISIBILITY } }]

      if (allowPersonalAccess) {
        visibilityClauses.push({ created_by: req.user.id })
      }

      if (visibilityClauses.length > 1) {
        where[Op.or] = visibilityClauses
      } else {
        where[Op.and] = [...(where[Op.and] ?? []), visibilityClauses[0]]
      }
    }

    // Apply access-based where clause for non-privileged users
    const accessWhere = buildReadableLocationsWhereClause(readContext)
    if (accessWhere) {
      if (where[Op.or]) {
        // Combine with existing OR clause
        where[Op.or] = [where[Op.or], accessWhere]
      } else if (where[Op.and]) {
        where[Op.and].push(accessWhere)
      } else {
        where[Op.and] = [accessWhere]
      }
    }

    const include = [
      {
        model: LocationType,
        as: 'locationType',
        attributes: ['id', 'name', 'description'],
      },
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'username'],
      },
      {
        model: Location,
        as: 'parent',
        attributes: ['id', 'name'],
      },
    ]

    if (includeEntities === 'true') {
      include.push({
        model: Entity,
        as: 'entities',
        attributes: ['id', 'name', 'entity_type_id'],
        include: [
          {
            model: EntityType,
            as: 'entityType',
            attributes: ['id', 'name'],
          },
        ],
      })
    }

    const locations = await Location.findAll({
      where,
      include,
      order: [['name', 'ASC']],
    })

    // Filter locations by access permissions (post-query filtering for complex access rules)
    const filteredLocations = locations.filter((location) =>
      canUserReadLocation(location, readContext),
    )
    if (!filteredLocations.length) {
      return res.json({ success: true, data: [] })
    }

    // Get child counts
    const locationIds = filteredLocations.map((l) => l.id)
    const childCounts = await Location.findAll({
      attributes: [
        'parent_id',
        [sequelize.fn('COUNT', sequelize.col('id')), 'child_count'],
      ],
      where: {
        parent_id: { [Op.in]: locationIds },
      },
      group: ['parent_id'],
      raw: true,
    })

    const childCountMap = new Map()
    childCounts.forEach((c) => {
      if (c.parent_id) {
        childCountMap.set(c.parent_id, parseInt(c.child_count, 10))
      }
    })

    // Fetch all importance records in one query if campaign context exists
    const campaignId = req.campaignContextId || null
    let importanceMap = new Map()
    if (campaignId) {
      const importanceLocationIds = filteredLocations.map((l) => l.id).filter(Boolean)
      if (importanceLocationIds.length > 0) {
        const importanceRecords = await LocationCampaignImportance.findAll({
          where: {
            location_id: { [Op.in]: importanceLocationIds },
            campaign_id: campaignId,
          },
        })
        importanceRecords.forEach((record) => {
          importanceMap.set(record.location_id, record.importance)
        })
      }
    }

    const locationsWithCounts = filteredLocations.map((location) => {
      const plain = location.toJSON()
      const result = {
        ...plain,
        childCount: childCountMap.get(location.id) || 0,
      }
      
      // Add importance if campaign context exists
      if (campaignId) {
        result.importance = importanceMap.get(location.id) || null
      } else {
        result.importance = null
      }
      
      return result
    })

    res.json({ success: true, data: locationsWithCounts })
  } catch (error) {
    console.error('Error fetching locations:', error)
    res.status(500).json({ success: false, message: error.message })
  }
}

// Get a single location by ID
export const getLocationById = async (req, res) => {
  try {
    const { id } = req.params

    const location = await Location.findByPk(id, {
      include: [
        {
          model: LocationType,
          as: 'locationType',
          attributes: ['id', 'name', 'description'],
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username'],
        },
        {
          model: Location,
          as: 'parent',
          attributes: ['id', 'name'],
          include: [
            {
              model: LocationType,
              as: 'locationType',
              attributes: ['id', 'name'],
            },
          ],
        },
        {
          model: Location,
          as: 'children',
          attributes: ['id', 'name'],
          include: [
            {
              model: LocationType,
              as: 'locationType',
              attributes: ['id', 'name'],
            },
          ],
        },
        {
          model: Entity,
          as: 'entities',
          attributes: ['id', 'name', 'entity_type_id'],
          include: [
            {
              model: EntityType,
              as: 'entityType',
              attributes: ['id', 'name'],
            },
          ],
        },
        {
          model: World,
          as: 'world',
          attributes: ['id', 'name'],
        },
      ],
    })

    if (!location) {
      return res.status(404).json({ success: false, message: 'Location not found' })
    }

    const access = await checkWorldAccess(location.world_id, req.user)
    if (!access.hasAccess && !access.isOwner && !access.isAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    const viewAsCharacterId =
      typeof req.query?.viewAsCharacterId === 'string'
        ? req.query.viewAsCharacterId.trim()
        : typeof req.query?.characterId === 'string'
          ? req.query.characterId.trim()
          : ''

    const readContext = await buildLocationReadContext({
      worldId: location.world_id,
      user: req.user,
      worldAccess: access,
      campaignContextId: req.campaignContextId,
      characterContextId: viewAsCharacterId,
    })

    // Check if user can read this location
    if (!canUserReadLocation(location, readContext)) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    // Get child count
    const childCount = await Location.count({
      where: { parent_id: location.id },
    })

    const locationData = location.toJSON()
    locationData.childCount = childCount

    // Add importance if campaign context exists
    const campaignId = req.campaignContextId || null
    if (campaignId) {
      const importanceRecord = await LocationCampaignImportance.findOne({
        where: {
          location_id: location.id,
          campaign_id: campaignId,
        },
      })
      locationData.importance = importanceRecord?.importance || null
    } else {
      locationData.importance = null
    }

    res.json({ success: true, data: locationData })
  } catch (error) {
    console.error('Error fetching location:', error)
    res.status(500).json({ success: false, message: error.message })
  }
}

// Get location hierarchy path (breadcrumbs)
export const getLocationPath = async (req, res) => {
  try {
    const { id } = req.params

    const location = await Location.findByPk(id, {
      attributes: ['id', 'name', 'parent_id', 'world_id'],
    })

    if (!location) {
      return res.status(404).json({ success: false, message: 'Location not found' })
    }

    const access = await checkWorldAccess(location.world_id, req.user)
    if (!access.hasAccess && !access.isOwner && !access.isAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    const path = []
    let current = location

    while (current) {
      path.unshift({
        id: current.id,
        name: current.name,
      })
      if (current.parent_id) {
        current = await Location.findByPk(current.parent_id, {
          attributes: ['id', 'name', 'parent_id'],
        })
      } else {
        current = null
      }
    }

    res.json({ success: true, data: path })
  } catch (error) {
    console.error('Error fetching location path:', error)
    res.status(500).json({ success: false, message: error.message })
  }
}

// Create a new location
export const createLocation = async (req, res) => {
  try {
    const { world_id, location_type_id, parent_id, name, description, metadata, coordinates } =
      req.body

    const worldId = normaliseId(world_id)
    if (!worldId) {
      return res.status(400).json({ success: false, message: 'world_id is required' })
    }

    const access = await checkWorldAccess(worldId, req.user)
    if (!access.world) {
      return res.status(404).json({ success: false, message: 'World not found' })
    }

    if (!access.hasAccess && !access.isOwner && !access.isAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    const locationTypeId = normaliseId(location_type_id)
    if (!locationTypeId) {
      return res.status(400).json({ success: false, message: 'location_type_id is required' })
    }

    const locationType = await LocationType.findByPk(locationTypeId)
    if (!locationType) {
      return res.status(404).json({ success: false, message: 'Location type not found' })
    }

    if (locationType.world_id && locationType.world_id !== worldId) {
      return res
        .status(400)
        .json({ success: false, message: 'Location type does not belong to this world' })
    }

    // Validate parent if provided
    if (parent_id) {
      const parentId = normaliseId(parent_id)
      const parent = await Location.findByPk(parentId)
      if (!parent) {
        return res.status(404).json({ success: false, message: 'Parent location not found' })
      }
      if (parent.world_id !== worldId) {
        return res
          .status(400)
          .json({ success: false, message: 'Parent location does not belong to this world' })
      }
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'name is required' })
    }

    // Resolve creation access to determine default access settings
    const creationAccessResult = await resolveEntityCreationAccess({
      world: access.world,
      user: req.user,
      campaignContextId: req.campaignContextId,
    })

    if (!creationAccessResult.allowed) {
      return res.status(403).json({
        success: false,
        message: creationAccessResult.reason || 'You do not have permission to create locations in this world.',
      })
    }

    const defaultCampaignId = creationAccessResult.defaultCampaignId ?? null
    const enforceCampaignScope = Boolean(
      creationAccessResult.enforceCampaignScope && defaultCampaignId,
    )

    // Set default access based on campaign context
    const defaultAccessMode = defaultCampaignId ? 'selective' : 'global'
    const defaultCampaignTargets = defaultCampaignId ? [defaultCampaignId] : []

    let readAccess = defaultAccessMode
    let writeAccess = defaultAccessMode
    let readCampaignIds = [...defaultCampaignTargets]
    let writeCampaignIds = [...defaultCampaignTargets]

    // Handle access inputs from request body
    const {
      read_access: readAccessInput,
      write_access: writeAccessInput,
      read_campaign_ids: readCampaignIdsInput,
      write_campaign_ids: writeCampaignIdsInput,
    } = req.body ?? {}

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

      if (writeCampaignIdsInput !== undefined) {
        writeCampaignIds = normaliseUuidArray(writeCampaignIdsInput, 'write_campaign_ids')
      }
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message })
    }

    // Clear campaign IDs if access mode is not selective
    if (readAccess !== 'selective') {
      readCampaignIds = []
    }

    if (writeAccess !== 'selective') {
      writeCampaignIds = []
    }

    // Enforce campaign scope if required
    if (enforceCampaignScope && defaultCampaignId) {
      readAccess = 'selective'
      writeAccess = 'selective'
      readCampaignIds = [defaultCampaignId]
      writeCampaignIds = [defaultCampaignId]
    }

    const location = await Location.create({
      world_id: worldId,
      created_by: req.user.id,
      location_type_id: locationTypeId,
      parent_id: parent_id ? normaliseId(parent_id) : null,
      name: name.trim(),
      description: description?.trim() || null,
      metadata: metadata && typeof metadata === 'object' ? metadata : {},
      coordinates: coordinates && typeof coordinates === 'object' ? coordinates : null,
      read_access: readAccess,
      write_access: writeAccess,
      read_campaign_ids: readCampaignIds,
      write_campaign_ids: writeCampaignIds,
    })

    const fullLocation = await Location.findByPk(location.id, {
      include: [
        {
          model: LocationType,
          as: 'locationType',
          attributes: ['id', 'name', 'description'],
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username'],
        },
        {
          model: Location,
          as: 'parent',
          attributes: ['id', 'name'],
        },
      ],
    })

    res.status(201).json({ success: true, data: fullLocation })
  } catch (error) {
    console.error('Error creating location:', error)
    res.status(500).json({ success: false, message: error.message })
  }
}

// Update a location
// Helper functions for access control
const READ_ACCESS_VALUES = new Set(['global', 'selective', 'hidden'])
const WRITE_ACCESS_VALUES = new Set(['global', 'selective', 'hidden', 'owner_only'])
const VISIBILITY_VALUES = new Set(['hidden', 'visible', 'partial'])

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
  if (!Array.isArray(value)) {
    throw new Error(`${fieldName} must be an array`)
  }
  return value
    .map((v) => {
      if (v === null || v === undefined) return null
      const str = String(v).trim()
      return str || null
    })
    .filter((v) => v !== null)
}

export const updateLocation = async (req, res) => {
  try {
    const { id } = req.params
    const {
      name,
      description,
      parent_id,
      location_type_id,
      metadata,
      coordinates,
      visibility,
      read_access: readAccessInput,
      write_access: writeAccessInput,
      read_campaign_ids: readCampaignIdsInput,
      read_user_ids: readUserIdsInput,
      read_character_ids: readCharacterIdsInput,
      write_campaign_ids: writeCampaignIdsInput,
      write_user_ids: writeUserIdsInput,
    } = req.body

    const location = await Location.findByPk(id, {
      include: [
        {
          model: World,
          as: 'world',
          attributes: ['id'],
        },
      ],
    })

    if (!location) {
      return res.status(404).json({ success: false, message: 'Location not found' })
    }

    const access = await checkWorldAccess(location.world_id, req.user)
    if (!access.hasAccess && !access.isOwner && !access.isAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    // Prevent circular references
    if (parent_id) {
      const parentId = normaliseId(parent_id)
      if (parentId === id) {
        return res.status(400).json({ success: false, message: 'Location cannot be its own parent' })
      }

      // Check if the new parent is a descendant
      let current = await Location.findByPk(parentId, {
        attributes: ['id', 'parent_id'],
      })
      while (current) {
        if (current.id === id) {
          return res
            .status(400)
            .json({ success: false, message: 'Cannot set parent to a descendant location' })
        }
        if (current.parent_id) {
          current = await Location.findByPk(current.parent_id, {
            attributes: ['id', 'parent_id'],
          })
        } else {
          current = null
        }
      }
    }

    // Normalize access control fields
    let readAccess
    let writeAccess
    let readCampaignIds
    let readUserIds
    let readCharacterIds
    let writeCampaignIds
    let writeUserIds

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
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message })
    }

    const updates = {}
    if (name !== undefined) {
      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, message: 'name cannot be empty' })
      }
      updates.name = name.trim()
    }
    if (description !== undefined) {
      updates.description = description?.trim() || null
    }
    if (parent_id !== undefined) {
      updates.parent_id = parent_id ? normaliseId(parent_id) : null
    }
    if (location_type_id !== undefined) {
      const locationTypeId = normaliseId(location_type_id)
      const locationType = await LocationType.findByPk(locationTypeId)
      if (!locationType) {
        return res.status(404).json({ success: false, message: 'Location type not found' })
      }
      updates.location_type_id = locationTypeId
    }
    if (metadata !== undefined) {
      updates.metadata = metadata && typeof metadata === 'object' ? metadata : {}
    }
    if (coordinates !== undefined) {
      updates.coordinates = coordinates && typeof coordinates === 'object' ? coordinates : null
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

    await location.update(updates)

    const updatedLocation = await Location.findByPk(location.id, {
      include: [
        {
          model: LocationType,
          as: 'locationType',
          attributes: ['id', 'name', 'description'],
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username'],
        },
        {
          model: Location,
          as: 'parent',
          attributes: ['id', 'name'],
        },
      ],
    })

    res.json({ success: true, data: updatedLocation })
  } catch (error) {
    console.error('Error updating location:', error)
    res.status(500).json({ success: false, message: error.message })
  }
}

// Delete a location
export const deleteLocation = async (req, res) => {
  try {
    const { id } = req.params

    const location = await Location.findByPk(id, {
      include: [
        {
          model: World,
          as: 'world',
          attributes: ['id'],
        },
      ],
    })

    if (!location) {
      return res.status(404).json({ success: false, message: 'Location not found' })
    }

    const access = await checkWorldAccess(location.world_id, req.user)
    if (!access.isOwner && !access.isAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    // Check for children
    const childCount = await Location.count({
      where: { parent_id: id },
    })

    if (childCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete location with child locations. Please delete or move children first.',
      })
    }

    // Check for entities
    const entityCount = await Entity.count({
      where: { location_id: id },
    })

    if (entityCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete location with entities. Please move entities first.',
      })
    }

    await location.destroy()

    res.json({ success: true, message: 'Location deleted successfully' })
  } catch (error) {
    console.error('Error deleting location:', error)
    res.status(500).json({ success: false, message: error.message })
  }
}

// Get entities in a location
export const getLocationEntities = async (req, res) => {
  try {
    const { id } = req.params

    const location = await Location.findByPk(id, {
      attributes: ['id', 'world_id'],
    })

    if (!location) {
      return res.status(404).json({ success: false, message: 'Location not found' })
    }

    const access = await checkWorldAccess(location.world_id, req.user)
    if (!access.hasAccess && !access.isOwner && !access.isAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    const entities = await Entity.findAll({
      where: { location_id: id },
      include: [
        {
          model: EntityType,
          as: 'entityType',
          attributes: ['id', 'name'],
        },
      ],
      order: [['name', 'ASC']],
    })

    res.json({ success: true, data: entities })
  } catch (error) {
    console.error('Error fetching location entities:', error)
    res.status(500).json({ success: false, message: error.message })
  }
}

// Move entity to a location
export const moveEntityToLocation = async (req, res) => {
  try {
    const { entityId } = req.params
    const { location_id } = req.body

    const entity = await Entity.findByPk(entityId, {
      attributes: ['id', 'world_id'],
    })

    if (!entity) {
      return res.status(404).json({ success: false, message: 'Entity not found' })
    }

    const access = await checkWorldAccess(entity.world_id, req.user)
    if (!access.hasAccess && !access.isOwner && !access.isAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    if (location_id) {
      const location = await Location.findByPk(location_id, {
        attributes: ['id', 'world_id'],
      })

      if (!location) {
        return res.status(404).json({ success: false, message: 'Location not found' })
      }

      if (location.world_id !== entity.world_id) {
        return res
          .status(400)
          .json({ success: false, message: 'Location and entity must belong to the same world' })
      }
    }

    await entity.update({ location_id: location_id ? normaliseId(location_id) : null })

    const updatedEntity = await Entity.findByPk(entityId, {
      include: [
        {
          model: Location,
          as: 'location',
          attributes: ['id', 'name'],
        },
      ],
    })

    res.json({ success: true, data: updatedEntity })
  } catch (error) {
    console.error('Error moving entity to location:', error)
    res.status(500).json({ success: false, message: error.message })
  }
}

// Add entity to location
export const addEntityToLocation = async (req, res) => {
  try {
    const { id } = req.params
    const { entity_id } = req.body

    if (!entity_id) {
      return res.status(400).json({ success: false, message: 'entity_id is required' })
    }

    const location = await Location.findByPk(id, {
      attributes: ['id', 'world_id'],
    })

    if (!location) {
      return res.status(404).json({ success: false, message: 'Location not found' })
    }

    const access = await checkWorldAccess(location.world_id, req.user)
    if (!access.hasAccess && !access.isOwner && !access.isAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    const entityId = normaliseId(entity_id)
    const entity = await Entity.findByPk(entityId, {
      attributes: ['id', 'world_id'],
    })

    if (!entity) {
      return res.status(404).json({ success: false, message: 'Entity not found' })
    }

    if (entity.world_id !== location.world_id) {
      return res
        .status(400)
        .json({ success: false, message: 'Location and entity must belong to the same world' })
    }

    await entity.update({ location_id: id })

    const updatedEntity = await Entity.findByPk(entityId, {
      include: [
        {
          model: EntityType,
          as: 'entityType',
          attributes: ['id', 'name'],
        },
      ],
    })

    res.json({ success: true, data: updatedEntity })
  } catch (error) {
    console.error('Error adding entity to location:', error)
    res.status(500).json({ success: false, message: error.message })
  }
}

// Remove entity from location
export const removeEntityFromLocation = async (req, res) => {
  try {
    const { id, entityId } = req.params

    const location = await Location.findByPk(id, {
      attributes: ['id', 'world_id'],
    })

    if (!location) {
      return res.status(404).json({ success: false, message: 'Location not found' })
    }

    const access = await checkWorldAccess(location.world_id, req.user)
    if (!access.hasAccess && !access.isOwner && !access.isAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    const entity = await Entity.findByPk(entityId, {
      attributes: ['id', 'world_id', 'location_id'],
    })

    if (!entity) {
      return res.status(404).json({ success: false, message: 'Entity not found' })
    }

    if (entity.location_id !== id) {
      return res.status(400).json({ success: false, message: 'Entity is not in this location' })
    }

    await entity.update({ location_id: null })

    res.json({ success: true, message: 'Entity removed from location' })
  } catch (error) {
    console.error('Error removing entity from location:', error)
    res.status(500).json({ success: false, message: error.message })
  }
}

// Add child location
export const addChildLocation = async (req, res) => {
  try {
    const { id } = req.params
    const { child_location_id } = req.body

    if (!child_location_id) {
      return res.status(400).json({ success: false, message: 'child_location_id is required' })
    }

    const parentLocation = await Location.findByPk(id, {
      attributes: ['id', 'world_id'],
    })

    if (!parentLocation) {
      return res.status(404).json({ success: false, message: 'Parent location not found' })
    }

    const access = await checkWorldAccess(parentLocation.world_id, req.user)
    if (!access.hasAccess && !access.isOwner && !access.isAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    const childLocationId = normaliseId(child_location_id)
    const childLocation = await Location.findByPk(childLocationId, {
      attributes: ['id', 'world_id', 'parent_id'],
    })

    if (!childLocation) {
      return res.status(404).json({ success: false, message: 'Child location not found' })
    }

    if (childLocation.world_id !== parentLocation.world_id) {
      return res
        .status(400)
        .json({ success: false, message: 'Locations must belong to the same world' })
    }

    // Prevent circular references
    if (childLocationId === id) {
      return res.status(400).json({ success: false, message: 'Location cannot be its own child' })
    }

    // Check if parent is a descendant of child
    let current = await Location.findByPk(id, {
      attributes: ['id', 'parent_id'],
    })
    while (current) {
      if (current.id === childLocationId) {
        return res
          .status(400)
          .json({ success: false, message: 'Cannot set child to a location that is its ancestor' })
      }
      if (current.parent_id) {
        current = await Location.findByPk(current.parent_id, {
          attributes: ['id', 'parent_id'],
        })
      } else {
        current = null
      }
    }

    await childLocation.update({ parent_id: id })

    const updatedLocation = await Location.findByPk(childLocationId, {
      include: [
        {
          model: LocationType,
          as: 'locationType',
          attributes: ['id', 'name'],
        },
        {
          model: Location,
          as: 'parent',
          attributes: ['id', 'name'],
        },
      ],
    })

    res.json({ success: true, data: updatedLocation })
  } catch (error) {
    console.error('Error adding child location:', error)
    res.status(500).json({ success: false, message: error.message })
  }
}

// Remove child location
export const removeChildLocation = async (req, res) => {
  try {
    const { id, childId } = req.params

    const parentLocation = await Location.findByPk(id, {
      attributes: ['id', 'world_id'],
    })

    if (!parentLocation) {
      return res.status(404).json({ success: false, message: 'Parent location not found' })
    }

    const access = await checkWorldAccess(parentLocation.world_id, req.user)
    if (!access.hasAccess && !access.isOwner && !access.isAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    const childLocation = await Location.findByPk(childId, {
      attributes: ['id', 'world_id', 'parent_id'],
    })

    if (!childLocation) {
      return res.status(404).json({ success: false, message: 'Child location not found' })
    }

    if (childLocation.parent_id !== id) {
      return res.status(400).json({ success: false, message: 'Location is not a child of this location' })
    }

    await childLocation.update({ parent_id: null })

    res.json({ success: true, message: 'Child location removed' })
  } catch (error) {
    console.error('Error removing child location:', error)
    res.status(500).json({ success: false, message: error.message })
  }
}

// Update location importance
export const updateLocationImportance = async (req, res) => {
  try {
    const { id } = req.params
    const { importance } = req.body
    const { user } = req
    const campaignId = req.campaignContextId

    if (!campaignId) {
      return res.status(400).json({
        success: false,
        message: 'Campaign context is required to set location importance',
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

    const location = await Location.findByPk(id, {
      include: [
        {
          model: World,
          as: 'world',
          attributes: ['id'],
        },
      ],
    })

    if (!location) {
      return res.status(404).json({ success: false, message: 'Location not found' })
    }

    const access = await checkWorldAccess(location.world_id, user)
    if (!access.hasAccess && !access.isOwner && !access.isAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    // Verify campaign exists and user has access
    const campaign = await Campaign.findByPk(campaignId)
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' })
    }

    if (campaign.world_id !== location.world_id) {
      return res.status(400).json({
        success: false,
        message: 'Campaign does not belong to the same world as the location',
      })
    }

    // Upsert importance record
    const [importanceRecord, created] = await LocationCampaignImportance.findOrCreate({
      where: {
        location_id: id,
        campaign_id: campaignId,
      },
      defaults: {
        location_id: id,
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

    // Reload location and return updated data
    const updatedLocation = await Location.findByPk(id, {
      include: [
        {
          model: LocationType,
          as: 'locationType',
          attributes: ['id', 'name', 'description'],
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username'],
        },
        {
          model: Location,
          as: 'parent',
          attributes: ['id', 'name'],
        },
      ],
    })

    const locationData = updatedLocation.toJSON()
    const finalImportanceRecord = await LocationCampaignImportance.findOne({
      where: {
        location_id: id,
        campaign_id: campaignId,
      },
    })
    locationData.importance = finalImportanceRecord?.importance || null

    res.json({ success: true, data: locationData })
  } catch (error) {
    console.error('Error updating location importance:', error)
    res.status(500).json({ success: false, message: error.message })
  }
}

