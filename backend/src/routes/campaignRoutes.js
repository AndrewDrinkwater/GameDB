import express from 'express'
import { Op } from 'sequelize'
import {
  Campaign,
  Character,
  User,
  UserCampaignRole,
  World,
  sequelize,
} from '../models/index.js'
import { authenticate as authMiddleware } from '../middleware/authMiddleware.js'

const router = express.Router()

const baseIncludes = [
  { model: User, as: 'owner', attributes: ['id', 'username'] },
  { model: World, as: 'world', attributes: ['id', 'name', 'created_by'] },
  {
    model: UserCampaignRole,
    as: 'members',
    attributes: ['id', 'role', 'user_id', 'campaign_id', 'createdAt'],
    include: [{ model: User, as: 'user', attributes: ['id', 'username', 'email', 'role'] }],
  },
]

const canManageCampaign = (campaign, user) => {
  if (!user || !campaign) return false
  return user.role === 'system_admin' || campaign.created_by === user.id
}

const buildAccessibleCampaignQuery = async (req, worldFilter) => {
  if (req.user.role === 'system_admin') {
    const query = { include: baseIncludes, order: [['createdAt', 'DESC']], distinct: true }
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

  const memberCampaigns = await UserCampaignRole.findAll({
    where: {
      user_id: req.user.id,
      role: { [Op.in]: ['player', 'dm'] },
    },
    attributes: ['campaign_id'],
    raw: true,
  })

  const accessibleIds = new Set(owned.map((c) => c.id))
  characterCampaigns.forEach(({ campaign_id }) => {
    if (campaign_id) accessibleIds.add(campaign_id)
  })

  memberCampaigns.forEach(({ campaign_id }) => {
    if (campaign_id) accessibleIds.add(campaign_id)
  })

  if (accessibleIds.size === 0) {
    return null
  }

  return {
    where: { id: [...accessibleIds], ...(worldFilter ? { world_id: worldFilter } : {}) },
    include: baseIncludes,
    order: [['createdAt', 'DESC']],
    distinct: true,
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

  if (participation > 0) {
    return { campaign }
  }

  const membership = await UserCampaignRole.count({
    where: { user_id: user.id, campaign_id: id },
  })

  if (membership === 0) {
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

    const campaign = await sequelize.transaction(async (transaction) => {
      const created = await Campaign.create(payload, { transaction })

      await UserCampaignRole.create(
        {
          campaign_id: created.id,
          user_id: payload.created_by,
          role: 'dm',
        },
        { transaction },
      )

      return created
    })

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

    let playersToSync = null

    if (Object.prototype.hasOwnProperty.call(req.body, 'player_ids')) {
      const rawValue = req.body.player_ids

      if (Array.isArray(rawValue)) {
        playersToSync = rawValue
      } else if (typeof rawValue === 'string') {
        playersToSync = rawValue
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean)
      } else if (rawValue === null || rawValue === '') {
        playersToSync = []
      } else {
        return res
          .status(400)
          .json({ success: false, message: 'player_ids must be an array of user IDs' })
      }

      if (playersToSync !== null) {
        playersToSync = [...new Set(playersToSync.map((value) => String(value)))]
      }
    }

    if (req.user.role === 'system_admin' && Object.prototype.hasOwnProperty.call(req.body, 'created_by')) {
      if (req.body.created_by === null || req.body.created_by === '') {
        updates.created_by = null
      } else {
        const newOwner = await User.findByPk(req.body.created_by)
        if (!newOwner) {
          return res.status(400).json({ success: false, message: 'Owner not found' })
        }
        updates.created_by = req.body.created_by
      }
    }

    await sequelize.transaction(async (transaction) => {
      if (Object.keys(updates).length > 0) {
        await campaign.update(updates, { transaction })
      }

      if (playersToSync !== null) {
        if (playersToSync.length > 0) {
          const users = await User.findAll({
            where: { id: playersToSync },
            attributes: ['id', 'role'],
            transaction,
          })

          if (users.length !== playersToSync.length) {
            throw new Error('One or more selected players could not be found')
          }
        }

        const existingPlayers = await UserCampaignRole.findAll({
          where: { campaign_id: campaign.id, role: 'player' },
          transaction,
        })

        const desiredPlayerIds = new Set(playersToSync)

        const assignmentsToRemove = existingPlayers.filter(
          (assignment) => !desiredPlayerIds.has(String(assignment.user_id))
        )

        if (assignmentsToRemove.length > 0) {
          await UserCampaignRole.destroy({
            where: { id: assignmentsToRemove.map((assignment) => assignment.id) },
            transaction,
          })
        }

        for (const userId of desiredPlayerIds) {
          const [record] = await UserCampaignRole.findOrCreate({
            where: { campaign_id: campaign.id, user_id: userId },
            defaults: { role: 'player' },
            transaction,
          })

          if (record.role !== 'player') {
            await record.update({ role: 'player' }, { transaction })
          }
        }
      }
    })

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

    await sequelize.transaction(async (transaction) => {
      await Character.destroy({ where: { campaign_id: campaign.id }, transaction })
      await UserCampaignRole.destroy({ where: { campaign_id: campaign.id }, transaction })
      await campaign.destroy({ transaction })
    })
    res.json({ success: true })
  } catch (err) {
    res.status(400).json({ success: false, message: err.message })
  }
})

export default router
