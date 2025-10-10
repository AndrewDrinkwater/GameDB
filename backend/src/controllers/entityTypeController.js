import { EntityType } from '../models/index.js'

export const listEntityTypes = async (req, res) => {
  try {
    const types = await EntityType.findAll({ order: [['name', 'ASC']] })
    res.json({ success: true, data: types })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}
