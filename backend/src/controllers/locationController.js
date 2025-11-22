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
  sequelize,
} from '../models/index.js'
import { checkWorldAccess } from '../middleware/worldAccess.js'

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

    const { parentId, locationTypeId, includeEntities } = req.query

    const where = {
      world_id: worldIdParam,
    }

    // Handle parentId: if explicitly provided (even as 'null'), use it
    // If not provided at all, default to root locations (parent_id is null)
    if (parentId !== undefined) {
      if (parentId === null || parentId === 'null' || parentId === '') {
        where.parent_id = null
      } else {
        const normalisedParentId = normaliseId(parentId)
        if (normalisedParentId) {
          where.parent_id = normalisedParentId
        }
      }
    } else {
      // Default to root locations when parentId is not specified
      where.parent_id = null
    }

    if (locationTypeId) {
      where.location_type_id = normaliseId(locationTypeId)
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

    // Get child counts
    const locationIds = locations.map((l) => l.id)
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

    const locationsWithCounts = locations.map((location) => {
      const plain = location.toJSON()
      return {
        ...plain,
        childCount: childCountMap.get(location.id) || 0,
      }
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

    // Get child count
    const childCount = await Location.count({
      where: { parent_id: location.id },
    })

    const locationData = location.toJSON()
    locationData.childCount = childCount

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

    const location = await Location.create({
      world_id: worldId,
      created_by: req.user.id,
      location_type_id: locationTypeId,
      parent_id: parent_id ? normaliseId(parent_id) : null,
      name: name.trim(),
      description: description?.trim() || null,
      metadata: metadata && typeof metadata === 'object' ? metadata : {},
      coordinates: coordinates && typeof coordinates === 'object' ? coordinates : null,
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

