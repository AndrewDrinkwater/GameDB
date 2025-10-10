import { Entity, EntityType } from '../models/index.js'

const isSystemAdmin = (user) => user?.role === 'system_admin'

const ensureManageAccess = (user) => isSystemAdmin(user)

export const listEntityTypes = async (req, res) => {
  try {
    const types = await EntityType.findAll({ order: [['name', 'ASC']] })
    res.json({ success: true, data: types })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const getEntityType = async (req, res) => {
  try {
    const { id } = req.params
    const entityType = await EntityType.findByPk(id)

    if (!entityType) {
      return res.status(404).json({ success: false, message: 'Entity type not found' })
    }

    return res.json({ success: true, data: entityType })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

export const createEntityType = async (req, res) => {
  try {
    const canManage = await ensureManageAccess(req.user)
    if (!canManage) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    const { name, description } = req.body ?? {}
    const trimmedName = typeof name === 'string' ? name.trim() : ''

    if (!trimmedName) {
      return res.status(400).json({ success: false, message: 'name is required' })
    }

    try {
      const entityType = await EntityType.create({
        name: trimmedName,
        description: description ?? null,
      })

      return res.status(201).json({ success: true, data: entityType })
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({ success: false, message: 'An entity type with this name already exists' })
      }
      throw error
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

export const updateEntityType = async (req, res) => {
  try {
    const canManage = await ensureManageAccess(req.user)
    if (!canManage) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    const { id } = req.params
    const entityType = await EntityType.findByPk(id)

    if (!entityType) {
      return res.status(404).json({ success: false, message: 'Entity type not found' })
    }

    const { name, description } = req.body ?? {}
    const updates = {}

    if (name !== undefined) {
      const trimmedName = typeof name === 'string' ? name.trim() : ''
      if (!trimmedName) {
        return res.status(400).json({ success: false, message: 'name cannot be empty' })
      }
      updates.name = trimmedName
    }

    if (description !== undefined) {
      updates.description = description ?? null
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No updates provided' })
    }

    try {
      await entityType.update(updates)
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({ success: false, message: 'An entity type with this name already exists' })
      }
      throw error
    }

    return res.json({ success: true, data: entityType })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

export const deleteEntityType = async (req, res) => {
  try {
    const canManage = await ensureManageAccess(req.user)
    if (!canManage) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    const { id } = req.params
    const entityType = await EntityType.findByPk(id)

    if (!entityType) {
      return res.status(404).json({ success: false, message: 'Entity type not found' })
    }

    const entityCount = await Entity.count({ where: { entity_type_id: id } })
    if (entityCount > 0) {
      return res
        .status(409)
        .json({ success: false, message: 'Cannot delete an entity type that is in use by existing entities' })
    }

    await entityType.destroy()

    return res.json({ success: true, message: 'Entity type deleted' })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}
