import { Campaign, UserCampaignRole } from '../models/index.js'

export const CAMPAIGN_CONTEXT_HEADER = 'x-campaign-context-id'

export const normaliseCampaignContextId = (value) => {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  return trimmed
}

export const parseCampaignContext = (req, _res, next) => {
  const headerValue =
    req.headers?.[CAMPAIGN_CONTEXT_HEADER] ??
    req.headers?.[CAMPAIGN_CONTEXT_HEADER.toLowerCase()] ??
    req.headers?.[CAMPAIGN_CONTEXT_HEADER.toUpperCase()]

  const contextId = normaliseCampaignContextId(headerValue || '')
  if (contextId) {
    req.campaignContextId = contextId
  }
  next()
}

export const requireCampaignDM = async (req, res, next) => {
  if (!req.campaignContextId) {
    return next()
  }

  if (!req.user?.id) {
    return res.status(401).json({ success: false, message: 'Authentication required' })
  }

  try {
    const membership = await UserCampaignRole.findOne({
      where: {
        user_id: req.user.id,
        campaign_id: req.campaignContextId,
        role: 'dm',
      },
      include: [
        {
          model: Campaign,
          as: 'campaign',
          attributes: ['id', 'name', 'world_id'],
        },
      ],
    })

    if (!membership) {
      const campaign = await Campaign.findByPk(req.campaignContextId, {
        attributes: ['id', 'name', 'world_id'],
      })

      if (campaign) {
        const hasMembership = await UserCampaignRole.count({
          where: { campaign_id: campaign.id, user_id: req.user.id },
        })

        if (hasMembership > 0) {
          return res.status(403).json({
            success: false,
            message: 'Only campaign DMs can perform this action.',
          })
        }
      }

      return next()
    }

    req.campaignRole = 'dm'
    req.campaignMembership = membership
    req.campaignContext = membership.campaign

    return next()
  } catch (error) {
    console.error('Failed to verify campaign DM role', error)
    return res.status(500).json({ success: false, message: 'Failed to verify campaign access' })
  }
}
