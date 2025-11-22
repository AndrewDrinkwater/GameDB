// src/controllers/locationTypeController.js
import { Op } from 'sequelize'
import { LocationType, LocationTypeField, World, Location, sequelize } from '../models/index.js'
import { checkWorldAccess } from '../middleware/worldAccess.js'

const isSystemAdmin = (user) => user?.role === 'system_admin'

const normaliseId = (value) => {
  if (!value) return null
  const trimmed = String(value).trim()
  return trimmed || null
}

// Get all location types for a world
export const getLocationTypes = async (req, res) => {
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

    const includeFields = req.query.includeFields === 'true'

    const where = {
      world_id: worldIdParam,
    }

    const include = []
    if (includeFields) {
      include.push({
        model: LocationTypeField,
        as: 'fields',
        order: [['sort_order', 'ASC']],
      })
    }

    include.push({
      model: LocationType,
      as: 'parentType',
      attributes: ['id', 'name'],
    })

    const locationTypes = await LocationType.findAll({
      where,
      include,
      order: [['sort_order', 'ASC'], ['name', 'ASC']],
    })

    // Get child type counts
    const locationTypeIds = locationTypes.map((lt) => lt.id)
    const childCounts = await LocationType.findAll({
      attributes: [
        'parent_type_id',
        [sequelize.fn('COUNT', sequelize.col('id')), 'child_count'],
      ],
      where: {
        parent_type_id: { [Op.in]: locationTypeIds },
      },
      group: ['parent_type_id'],
      raw: true,
    })

    const childCountMap = new Map()
    childCounts.forEach((c) => {
      if (c.parent_type_id) {
        childCountMap.set(c.parent_type_id, parseInt(c.child_count, 10))
      }
    })

    const locationTypesWithCounts = locationTypes.map((locationType) => {
      const plain = locationType.toJSON()
      return {
        ...plain,
        childTypeCount: childCountMap.get(locationType.id) || 0,
      }
    })

    res.json({ success: true, data: locationTypesWithCounts })
  } catch (error) {
    console.error('Error fetching location types:', error)
    res.status(500).json({ success: false, message: error.message })
  }
}

// Get a single location type by ID
export const getLocationTypeById = async (req, res) => {
  try {
    const { id } = req.params

    const locationType = await LocationType.findByPk(id, {
      include: [
        {
          model: LocationTypeField,
          as: 'fields',
          order: [['sort_order', 'ASC']],
        },
        {
          model: LocationType,
          as: 'parentType',
          attributes: ['id', 'name'],
        },
        {
          model: LocationType,
          as: 'childTypes',
          attributes: ['id', 'name'],
        },
        {
          model: World,
          as: 'world',
          attributes: ['id', 'name'],
        },
      ],
    })

    if (!locationType) {
      return res.status(404).json({ success: false, message: 'Location type not found' })
    }

    if (locationType.world_id) {
      const access = await checkWorldAccess(locationType.world_id, req.user)
      if (!access.hasAccess && !access.isOwner && !access.isAdmin) {
        return res.status(403).json({ success: false, message: 'Forbidden' })
      }
    } else if (!isSystemAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    res.json({ success: true, data: locationType })
  } catch (error) {
    console.error('Error fetching location type:', error)
    res.status(500).json({ success: false, message: error.message })
  }
}

// Create a new location type
export const createLocationType = async (req, res) => {
  try {
    const { world_id, name, description, parent_type_id, sort_order } = req.body

    const worldId = normaliseId(world_id)
    if (!worldId) {
      return res.status(400).json({ success: false, message: 'world_id is required' })
    }

    const access = await checkWorldAccess(worldId, req.user)
    if (!access.world) {
      return res.status(404).json({ success: false, message: 'World not found' })
    }

    if (!access.isOwner && !access.isAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'name is required' })
    }

    // Validate parent if provided
    if (parent_type_id) {
      const parentId = normaliseId(parent_type_id)
      const parent = await LocationType.findByPk(parentId)
      if (!parent) {
        return res.status(404).json({ success: false, message: 'Parent location type not found' })
      }
      if (parent.world_id && parent.world_id !== worldId) {
        return res
          .status(400)
          .json({ success: false, message: 'Parent location type does not belong to this world' })
      }
    }

    const locationType = await LocationType.create({
      world_id: worldId,
      name: name.trim(),
      description: description?.trim() || null,
      parent_type_id: parent_type_id ? normaliseId(parent_type_id) : null,
      sort_order: sort_order || 0,
    })

    const fullLocationType = await LocationType.findByPk(locationType.id, {
      include: [
        {
          model: LocationType,
          as: 'parentType',
          attributes: ['id', 'name'],
        },
        {
          model: World,
          as: 'world',
          attributes: ['id', 'name'],
        },
      ],
    })

    res.status(201).json({ success: true, data: fullLocationType })
  } catch (error) {
    console.error('Error creating location type:', error)
    res.status(500).json({ success: false, message: error.message })
  }
}

// Update a location type
export const updateLocationType = async (req, res) => {
  try {
    const { id } = req.params
    const { name, description, parent_type_id, sort_order } = req.body

    const locationType = await LocationType.findByPk(id, {
      include: [
        {
          model: World,
          as: 'world',
          attributes: ['id'],
        },
      ],
    })

    if (!locationType) {
      return res.status(404).json({ success: false, message: 'Location type not found' })
    }

    if (locationType.world_id) {
      const access = await checkWorldAccess(locationType.world_id, req.user)
      if (!access.isOwner && !access.isAdmin) {
        return res.status(403).json({ success: false, message: 'Forbidden' })
      }
    } else if (!isSystemAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    // Prevent circular references
    if (parent_type_id) {
      const parentId = normaliseId(parent_type_id)
      if (parentId === id) {
        return res
          .status(400)
          .json({ success: false, message: 'Location type cannot be its own parent' })
      }

      // Check if the new parent is a descendant
      let current = await LocationType.findByPk(parentId, {
        attributes: ['id', 'parent_type_id'],
      })
      while (current) {
        if (current.id === id) {
          return res
            .status(400)
            .json({ success: false, message: 'Cannot set parent to a descendant location type' })
        }
        if (current.parent_type_id) {
          current = await LocationType.findByPk(current.parent_type_id, {
            attributes: ['id', 'parent_type_id'],
          })
        } else {
          current = null
        }
      }
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
    if (parent_type_id !== undefined) {
      updates.parent_type_id = parent_type_id ? normaliseId(parent_type_id) : null
    }
    if (sort_order !== undefined) {
      updates.sort_order = sort_order || 0
    }

    await locationType.update(updates)

    const updatedLocationType = await LocationType.findByPk(locationType.id, {
      include: [
        {
          model: LocationType,
          as: 'parentType',
          attributes: ['id', 'name'],
        },
        {
          model: World,
          as: 'world',
          attributes: ['id', 'name'],
        },
      ],
    })

    res.json({ success: true, data: updatedLocationType })
  } catch (error) {
    console.error('Error updating location type:', error)
    res.status(500).json({ success: false, message: error.message })
  }
}

// Delete a location type
export const deleteLocationType = async (req, res) => {
  try {
    const { id } = req.params

    const locationType = await LocationType.findByPk(id, {
      include: [
        {
          model: World,
          as: 'world',
          attributes: ['id'],
        },
      ],
    })

    if (!locationType) {
      return res.status(404).json({ success: false, message: 'Location type not found' })
    }

    if (locationType.world_id) {
      const access = await checkWorldAccess(locationType.world_id, req.user)
      if (!access.isOwner && !access.isAdmin) {
        return res.status(403).json({ success: false, message: 'Forbidden' })
      }
    } else if (!isSystemAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    // Check for child types
    const childCount = await LocationType.count({
      where: { parent_type_id: id },
    })

    if (childCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete location type with child types. Please delete or move children first.',
      })
    }

    // Check for locations using this type
    const locationCount = await Location.count({
      where: { location_type_id: id },
    })

    if (locationCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete location type with locations. Please delete or change locations first.',
      })
    }

    await locationType.destroy()

    res.json({ success: true, message: 'Location type deleted successfully' })
  } catch (error) {
    console.error('Error deleting location type:', error)
    res.status(500).json({ success: false, message: error.message })
  }
}

