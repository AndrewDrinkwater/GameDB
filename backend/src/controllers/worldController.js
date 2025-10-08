import { World, User } from '../models/index.js'

// Get all worlds (admins see all, others only their own)
export const getWorlds = async (req, res) => {
  try {
    const where =
      req.user.role === 'system_admin'
        ? {}
        : { created_by: req.user.id }

    const worlds = await World.findAll({
      where,
      include: [{ model: User, as: 'creator', attributes: ['id', 'username', 'role'] }],
    })
    res.json({ success: true, data: worlds })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// Create a new world
export const createWorld = async (req, res) => {
  try {
    const { name, description } = req.body
    if (!name) {
      return res.status(400).json({ success: false, message: 'Name is required' })
    }

    const world = await World.create({
      name,
      description,
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

    const { name, description, system, genre } = req.body
    await world.update({ name, description, system, genre })

    res.json({ success: true, data: world })
  } catch (err) {
    console.error('❌ Update world error:', err)
    res.status(500).json({ success: false, message: 'Server error during update' })
  }
}
