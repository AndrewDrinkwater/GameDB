import { World, User, Campaign, Character } from '../models/index.js'

const ENTITY_CREATION_SCOPES = new Set(['owner_dm', 'all_players'])

const normaliseEntityCreationScope = (raw) => {
  if (raw === undefined || raw === null || raw === '') return undefined
  const value = String(raw).trim().toLowerCase()
  if (!ENTITY_CREATION_SCOPES.has(value)) {
    return null
  }
  return value
}

// Get all worlds (admins see all, others only their own)
export const getWorlds = async (req, res) => {
  try {
    let worlds

    if (req.user.role === 'system_admin') {
      worlds = await World.findAll({
        include: [{ model: User, as: 'creator', attributes: ['id', 'username', 'role'] }],
      })
    } else {
      const ownedWorlds = await World.findAll({
        where: { created_by: req.user.id },
        attributes: ['id'],
        raw: true,
      })

      const characterCampaigns = await Character.findAll({
        where: { user_id: req.user.id },
        attributes: [],
        include: [
          {
            model: Campaign,
            as: 'campaign',
            attributes: ['world_id'],
          },
        ],
      })

      const accessibleWorldIds = new Set(ownedWorlds.map((w) => w.id))
      characterCampaigns.forEach((character) => {
        const worldId = character.campaign?.world_id
        if (worldId) accessibleWorldIds.add(worldId)
      })

      if (accessibleWorldIds.size === 0) {
        return res.json({ success: true, data: [] })
      }

      worlds = await World.findAll({
        where: { id: [...accessibleWorldIds] },
        include: [{ model: User, as: 'creator', attributes: ['id', 'username', 'role'] }],
      })
    }

    res.json({ success: true, data: worlds })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// Create a new world
const normaliseStatus = (raw) => {
  if (raw === undefined || raw === null || raw === '') return undefined
  const allowed = ['active', 'archived']
  const value = String(raw).toLowerCase()
  return allowed.includes(value) ? value : null
}

export const createWorld = async (req, res) => {
  try {
    const { name, description, system, status, entity_creation_scope: rawScope } = req.body
    if (!name) {
      return res.status(400).json({ success: false, message: 'Name is required' })
    }

    const normalisedStatus = normaliseStatus(status)
    if (normalisedStatus === null) {
      return res.status(400).json({ success: false, message: 'Invalid status value' })
    }

    const normalisedScope = normaliseEntityCreationScope(rawScope)
    if (normalisedScope === null) {
      return res.status(400).json({ success: false, message: 'Invalid entity creation scope' })
    }

    const world = await World.create({
      name,
      description,
      system,
      ...(normalisedStatus ? { status: normalisedStatus } : {}),
      ...(normalisedScope ? { entity_creation_scope: normalisedScope } : {}),
      created_by: req.user.id,
    })

    res.status(201).json({ success: true, data: world })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// Delete a world (only creator or admin)
export const deleteWorld = async (req, res) => {
  try {
    const world = await World.findByPk(req.params.id)
    if (!world) {
      return res.status(404).json({ success: false, message: 'World not found' })
    }

    if (req.user.role !== 'system_admin' && world.created_by !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorised to delete this world' })
    }

    await world.destroy()
    res.json({ success: true, message: 'World deleted' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// Update world
export const updateWorld = async (req, res) => {
  try {
    const { id } = req.params
    const world = await World.findByPk(id)

    if (!world) {
      return res.status(404).json({ success: false, message: 'World not found' })
    }

    if (req.user.role !== 'system_admin' && world.created_by !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorised to edit this world' })
    }

    const { name, description, system, status, entity_creation_scope: rawScope } = req.body
    const normalisedStatus = normaliseStatus(status)
    if (normalisedStatus === null) {
      return res.status(400).json({ success: false, message: 'Invalid status value' })
    }

    const normalisedScope = normaliseEntityCreationScope(rawScope)
    if (normalisedScope === null) {
      return res.status(400).json({ success: false, message: 'Invalid entity creation scope' })
    }

    const updates = {}
    if (name !== undefined) updates.name = name
    if (description !== undefined) updates.description = description
    if (system !== undefined) updates.system = system
    if (normalisedStatus !== undefined) updates.status = normalisedStatus
    if (normalisedScope !== undefined) updates.entity_creation_scope = normalisedScope

    await world.update(updates)

    res.json({ success: true, data: world })
  } catch (err) {
    console.error('❌ Update world error:', err)
    res.status(500).json({ success: false, message: 'Server error during update' })
  }
}
