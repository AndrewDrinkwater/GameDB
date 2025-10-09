import express from 'express'
import { Campaign, Character, User, World } from '../models/index.js'
import { authenticate as authMiddleware } from '../middleware/authMiddleware.js'

const router = express.Router()

const baseIncludes = [
  { model: User, as: 'owner', attributes: ['id', 'username'] },
  { model: World, as: 'world', attributes: ['id', 'name'] },
]

const canManageCampaign = (campaign, user) => {
  if (!user || !campaign) return false
  return user.role === 'system_admin' || campaign.created_by === user.id
}

const buildAccessibleCampaignQuery = async (req, worldFilter) => {
  if (req.user.role === 'system_admin') {
    const query = { include: baseIncludes, order: [['createdAt', 'DESC']] }
    if (worldFilter) query.where = { world_id: worldFilter }
    return query
  }

  const owned = await Campaign.findAll({
    where: { created_by: req.user.id, ...(worldFilter ? { world_id: worldFilter } : {}) },
    attributes: ['id'],
    raw: true,
  })

  const characterCampaigns = await Character.findAll({
    where: { user_id: req.user.id },
    attributes: ['campaign_id'],
    raw: true,
  })

  const accessibleIds = new Set(owned.map((c) => c.id))
  characterCampaigns.forEach(({ campaign_id }) => {
    if (campaign_id) accessibleIds.add(campaign_id)
  })

  if (accessibleIds.size === 0) {
    return null
  }

  return {
    where: { id: [...accessibleIds], ...(worldFilter ? { world_id: worldFilter } : {}) },
    include: baseIncludes,
    order: [['createdAt', 'DESC']],
  }
}

const fetchCampaignById = async (id, user) => {
  const campaign = await Campaign.findByPk(id, { include: baseIncludes })
  if (!campaign) return { error: { status: 404, message: 'Not found' } }

  if (user.role === 'system_admin') {
    return { campaign }
  }

  if (campaign.created_by === user.id) {
    return { campaign }
  }

  const participation = await Character.count({
    where: { user_id: user.id, campaign_id: id },
  })

  if (participation === 0) {
    return { error: { status: 403, message: 'Forbidden' } }
  }

  return { campaign }
}

// ✅ Get all campaigns (optionally filter by world)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const worldFilter = req.query.world_id
    const query = await buildAccessibleCampaignQuery(req, worldFilter)

    if (!query) {
      return res.json({ success: true, data: [] })
    }

    const campaigns = await Campaign.findAll(query)
    res.json({ success: true, data: campaigns })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// ✅ Get single campaign
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { campaign, error } = await fetchCampaignById(req.params.id, req.user)
    if (error) return res.status(error.status).json({ success: false, message: error.message })
    res.json({ success: true, data: campaign })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// ✅ Create campaign
router.post('/', authMiddleware, async (req, res) => {
  try {
    const payload = {
      name: req.body.name,
      description: req.body.description,
      status: req.body.status,
      world_id: req.body.world_id,
      created_by: req.user.id,
    }

    const campaign = await Campaign.create(payload)
    const withOwner = await Campaign.findByPk(campaign.id, { include: baseIncludes })
    res.status(201).json({ success: true, data: withOwner })
  } catch (err) {
    res.status(400).json({ success: false, message: err.message })
  }
})

// ✅ Update campaign
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { campaign, error } = await fetchCampaignById(req.params.id, req.user)
    if (error) return res.status(error.status).json({ success: false, message: error.message })

    if (!canManageCampaign(campaign, req.user)) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    const updates = {
      name: req.body.name ?? campaign.name,
      description: req.body.description ?? campaign.description,
      status: req.body.status ?? campaign.status,
    }

    await campaign.update(updates)
    const refreshed = await Campaign.findByPk(campaign.id, { include: baseIncludes })
    res.json({ success: true, data: refreshed })
  } catch (err) {
    res.status(400).json({ success: false, message: err.message })
  }
})

// ✅ Delete campaign
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { campaign, error } = await fetchCampaignById(req.params.id, req.user)
    if (error) return res.status(error.status).json({ success: false, message: error.message })

    if (!canManageCampaign(campaign, req.user)) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    await campaign.destroy()
    res.json({ success: true })
  } catch (err) {
    res.status(400).json({ success: false, message: err.message })
  }
})

export default router
