import express from 'express'
import { Op } from 'sequelize'
import { Character, Campaign, User, UserCampaignRole } from '../models/index.js'
import { authenticate as authMiddleware } from '../middleware/authMiddleware.js'

const router = express.Router()

const ensureCampaignAccess = async (campaignId, user) => {
  if (!campaignId) {
    return { error: { status: 400, message: 'Campaign is required' } }
  }

  const campaign = await Campaign.findByPk(campaignId, {
    attributes: ['id', 'created_by'],
  })

  if (!campaign) {
    return { error: { status: 404, message: 'Campaign not found' } }
  }

  if (campaign.created_by === user.id || user.role === 'system_admin') {
    return { campaign }
  }

  const membership = await UserCampaignRole.findOne({
    where: {
      campaign_id: campaignId,
      user_id: user.id,
      role: { [Op.in]: ['player', 'dm'] },
    },
  })

  if (!membership) {
    return { error: { status: 403, message: 'You are not allowed to use this campaign' } }
  }

  return { campaign }
}

// ✅ Get all characters (optional filters)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const scope = req.query.scope
    const where = {}

    if (scope === 'my') {
      where.user_id = req.user.id
    } else if (scope === 'others') {
      const [myCharacters, dmMemberships, ownedCampaigns] = await Promise.all([
        Character.findAll({
          where: { user_id: req.user.id },
          attributes: ['campaign_id'],
          raw: true,
        }),
        UserCampaignRole.findAll({
          where: {
            user_id: req.user.id,
            role: { [Op.in]: ['dm'] },
          },
          attributes: ['campaign_id'],
          raw: true,
        }),
        Campaign.findAll({
          where: { created_by: req.user.id },
          attributes: ['id'],
          raw: true,
        }),
      ])

      const campaignIds = [
        ...new Set(
          [
            ...myCharacters.map((c) => c.campaign_id),
            ...dmMemberships.map((c) => c.campaign_id),
            ...ownedCampaigns.map((c) => c.id),
          ].filter((id) => !!id)
        ),
      ]

      if (campaignIds.length === 0) {
        return res.json({ success: true, data: [] })
      }

      where.campaign_id = { [Op.in]: campaignIds }
      where[Op.or] = [
        { user_id: { [Op.ne]: req.user.id } },
        { user_id: null },
      ]
    } else if (scope === 'companions') {
      const campaignId = req.query.campaign_id

      if (!campaignId) {
        return res
          .status(400)
          .json({ success: false, message: 'Campaign is required to view companions' })
      }

      const membership = await UserCampaignRole.findOne({
        where: {
          campaign_id: campaignId,
          user_id: req.user.id,
          role: 'player',
        },
        raw: true,
      })

      if (!membership) {
        return res
          .status(403)
          .json({ success: false, message: 'You must be a player in this campaign' })
      }

      const campaignPlayers = await UserCampaignRole.findAll({
        where: { campaign_id: campaignId, role: 'player' },
        attributes: ['user_id'],
        raw: true,
      })

      const playerIds = [
        ...new Set(
          campaignPlayers
            .map((member) => member?.user_id)
            .filter((id) => id && String(id) !== String(req.user.id)),
        ),
      ]

      if (playerIds.length === 0) {
        return res.json({ success: true, data: [] })
      }

      where.campaign_id = campaignId
      where.user_id = { [Op.in]: playerIds }
    } else if (scope === 'all') {
      if (req.user.role !== 'system_admin') {
        return res
          .status(403)
          .json({ success: false, message: 'Forbidden' })
      }
    } else {
      if (req.query.campaign_id) where.campaign_id = req.query.campaign_id
      if (req.query.user_id) where.user_id = req.query.user_id
    }

    const characters = await Character.findAll({
      where,
      include: [
        { model: User, as: 'player', attributes: ['id', 'username', 'email'] },
        { model: Campaign, as: 'campaign', attributes: ['id', 'name'] },
      ],
      order: [['createdAt', 'DESC']],
    })

    res.json({ success: true, data: characters })
  } catch (err) {
    console.error('❌ Failed to fetch characters:', err)
    res.status(500).json({ success: false, message: err.message })
  }
})

// ✅ Get a single character
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const character = await Character.findByPk(req.params.id, {
      include: [
        { model: User, as: 'player', attributes: ['id', 'username', 'email'] },
        { model: Campaign, as: 'campaign', attributes: ['id', 'name'] },
      ],
    })

    if (!character) {
      return res.status(404).json({ success: false, message: 'Character not found' })
    }

    res.json({ success: true, data: character })
  } catch (err) {
    console.error('❌ Failed to fetch character:', err)
    res.status(500).json({ success: false, message: err.message })
  }
})

// ✅ Create a new character
router.post('/', authMiddleware, async (req, res) => {
  try {
    const payload = { ...req.body }

    if (req.user.role !== 'system_admin') {
      const { error } = await ensureCampaignAccess(payload.campaign_id, req.user)
      if (error) {
        return res.status(error.status).json({ success: false, message: error.message })
      }

      payload.user_id = req.user.id
    }

    if (!payload.campaign_id) {
      return res.status(400).json({ success: false, message: 'Campaign is required' })
    }

    const character = await Character.create(payload)
    res.status(201).json({ success: true, data: character })
  } catch (err) {
    console.error('❌ Failed to create character:', err)
    res.status(400).json({ success: false, message: err.message })
  }
})

// ✅ Update an existing character
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const character = await Character.findByPk(req.params.id)

    if (!character) {
      return res.status(404).json({ success: false, message: 'Character not found' })
    }

    if (req.user.role !== 'system_admin' && character.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    const payload = { ...req.body }
    const requestedCampaignId = payload.campaign_id

    if (req.user.role !== 'system_admin') {
      payload.user_id = character.user_id

      if (
        requestedCampaignId &&
        String(requestedCampaignId) !== String(character.campaign_id)
      ) {
        const { error } = await ensureCampaignAccess(requestedCampaignId, req.user)
        if (error) {
          return res.status(error.status).json({ success: false, message: error.message })
        }
      }
    }

    if (!requestedCampaignId) {
      delete payload.campaign_id
    }

    const [updated] = await Character.update(payload, { where: { id: req.params.id } })
    res.json({ success: true, updated })
  } catch (err) {
    console.error('❌ Failed to update character:', err)
    res.status(400).json({ success: false, message: err.message })
  }
})

// ✅ Delete a character
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const character = await Character.findByPk(req.params.id)

    if (!character) {
      return res.status(404).json({ success: false, message: 'Character not found' })
    }

    if (req.user.role !== 'system_admin' && character.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    await Character.destroy({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (err) {
    console.error('❌ Failed to delete character:', err)
    res.status(400).json({ success: false, message: err.message })
  }
})

export default router
