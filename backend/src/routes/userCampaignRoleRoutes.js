import express from 'express'
import { Campaign, User, UserCampaignRole } from '../models/index.js'
import { authenticate as authMiddleware } from '../middleware/authMiddleware.js'

const router = express.Router()

const includeUser = [{ model: User, as: 'user', attributes: ['id', 'username', 'email', 'role'] }]

const canManage = (campaign, user) => {
  if (!campaign || !user) return false
  if (user.role === 'system_admin') return true
  return campaign.created_by === user.id
}

router.get('/', authMiddleware, async (req, res) => {
  try {
    const where = {}
    if (req.query.user_id) where.user_id = req.query.user_id
    if (req.query.campaign_id) where.campaign_id = req.query.campaign_id

    if (req.query.campaign_id) {
      const campaign = await Campaign.findByPk(req.query.campaign_id, {
        attributes: ['id', 'created_by'],
      })
      if (!campaign) {
        return res.status(404).json({ success: false, message: 'Campaign not found' })
      }

      if (!canManage(campaign, req.user)) {
        return res.status(403).json({ success: false, message: 'Forbidden' })
      }
    } else if (req.query.user_id && req.query.user_id !== req.user.id && req.user.role !== 'system_admin') {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    const data = await UserCampaignRole.findAll({
      where,
      include: includeUser,
      order: [['createdAt', 'DESC']],
    })
    res.json({ success: true, data })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { campaign_id, user_id, role = 'player' } = req.body || {}

    if (!campaign_id || !user_id) {
      return res.status(400).json({ success: false, message: 'campaign_id and user_id are required' })
    }

    const campaign = await Campaign.findByPk(campaign_id, {
      attributes: ['id', 'created_by'],
    })
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' })
    }

    if (!canManage(campaign, req.user)) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    const targetUser = await User.findByPk(user_id)
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    const [record, created] = await UserCampaignRole.findOrCreate({
      where: { campaign_id, user_id },
      defaults: { role },
    })

    if (record.role !== role) {
      await record.update({ role })
    }

    const withUser = await UserCampaignRole.findByPk(record.id, { include: includeUser })
    res.status(created ? 201 : 200).json({ success: true, data: withUser })
  } catch (err) {
    res.status(400).json({ success: false, message: err.message })
  }
})

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const record = await UserCampaignRole.findByPk(req.params.id, { include: includeUser })
    if (!record) {
      return res.status(404).json({ success: false, message: 'Assignment not found' })
    }

    const campaign = await Campaign.findByPk(record.campaign_id, {
      attributes: ['id', 'created_by'],
    })
    if (!canManage(campaign, req.user)) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    const updates = {}
    if (req.body.role) updates.role = req.body.role

    if (Object.keys(updates).length === 0) {
      return res.json({ success: true, data: record })
    }

    await record.update(updates)
    const updated = await UserCampaignRole.findByPk(record.id, { include: includeUser })
    res.json({ success: true, data: updated })
  } catch (err) {
    res.status(400).json({ success: false, message: err.message })
  }
})

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const record = await UserCampaignRole.findByPk(req.params.id)
    if (!record) {
      return res.status(404).json({ success: false, message: 'Assignment not found' })
    }

    const campaign = await Campaign.findByPk(record.campaign_id, {
      attributes: ['id', 'created_by'],
    })
    if (!canManage(campaign, req.user)) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    await record.destroy()
    res.json({ success: true })
  } catch (err) {
    res.status(400).json({ success: false, message: err.message })
  }
})

export default router
