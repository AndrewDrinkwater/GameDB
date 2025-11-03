import { Op } from 'sequelize'
import { Campaign, Character } from '../models/index.js'

const toPlainEntity = (entity) =>
  typeof entity?.get === 'function' ? entity.get({ plain: true }) : entity ?? {}

const normaliseId = (value) => {
  if (!value) return null
  return typeof value === 'string' ? value : value.id ?? null
}

export const fetchUserWorldCharacterCampaignIds = async (worldId, userId) => {
  if (!worldId || !userId) {
    return { campaignIds: new Set(), hasAnyCharacter: false }
  }

  const characters = await Character.findAll({
    where: { user_id: userId },
    attributes: ['campaign_id'],
    include: [
      {
        model: Campaign,
        as: 'campaign',
        required: true,
        attributes: ['id'],
        where: { world_id: worldId },
      },
    ],
  })

  const campaignIds = new Set()

  characters.forEach((character) => {
    const plain = character.get({ plain: true })
    const campaignId = normaliseId(plain.campaign) ?? plain.campaign_id
    if (campaignId) {
      campaignIds.add(String(campaignId))
    }
  })

  return { campaignIds, hasAnyCharacter: campaignIds.size > 0 }
}

export const buildEntityReadContext = async ({ worldId, user, worldAccess }) => {
  const userId = user?.id ?? null
  const isAdmin = Boolean(worldAccess?.isAdmin || user?.role === 'system_admin')
  const isOwner = Boolean(worldAccess?.isOwner)

  if (!userId || isAdmin || isOwner) {
    return {
      userId,
      isAdmin,
      isOwner,
      campaignIds: new Set(),
      hasWorldCharacter: false,
      worldAccess: worldAccess ?? null,
    }
  }

  const { campaignIds, hasAnyCharacter } = await fetchUserWorldCharacterCampaignIds(worldId, userId)

  return {
    userId,
    isAdmin,
    isOwner,
    campaignIds,
    hasWorldCharacter: hasAnyCharacter,
    worldAccess: worldAccess ?? null,
  }
}

export const canUserReadEntity = (entityInput, context) => {
  const entity = toPlainEntity(entityInput)
  const readAccess = entity.read_access ?? 'global'
  const readCampaignIds = Array.isArray(entity.read_campaign_ids)
    ? entity.read_campaign_ids.filter(Boolean)
    : []
  const readUserIds = Array.isArray(entity.read_user_ids)
    ? entity.read_user_ids.filter(Boolean)
    : []

  const userId = context?.userId ?? null
  const isAdmin = Boolean(context?.isAdmin)
  const isOwner = Boolean(context?.isOwner)
  const worldAccess = context?.worldAccess ?? null
  const hasWorldAccess = Boolean(worldAccess?.hasAccess)
  const campaignIds = context?.campaignIds ?? new Set()
  const hasWorldCharacter = Boolean(context?.hasWorldCharacter)

  const createdBy = entity.created_by ?? entity.createdBy ?? entity.createdById ?? null
  const isCreator = Boolean(userId && createdBy && String(createdBy) === String(userId))

  if (isAdmin || isOwner || isCreator) {
    return true
  }

  if (!userId) {
    return false
  }

  if (readAccess === 'hidden') {
    return false
  }

  if (readAccess === 'global' || readAccess === null) {
    return hasWorldAccess || hasWorldCharacter
  }

  if (readAccess === 'selective') {
    if (readUserIds.some((id) => String(id) === String(userId))) {
      return true
    }

    if (campaignIds.size > 0 && readCampaignIds.length > 0) {
      return readCampaignIds.some((id) => campaignIds.has(String(id)))
    }

    return false
  }

  return false
}

export const buildReadableEntitiesWhereClause = (context) => {
  if (!context || context.isAdmin || context.isOwner) {
    return null
  }

  const clauses = []
  const userId = context.userId ?? null

  if (userId) {
    clauses.push({ created_by: userId })
  }

  if (context.hasWorldCharacter || context.worldAccess?.hasAccess) {
    clauses.push({
      [Op.or]: [{ read_access: 'global' }, { read_access: { [Op.is]: null } }],
    })
  }

  if (context.campaignIds && context.campaignIds.size > 0) {
    clauses.push({
      [Op.and]: [
        { read_access: 'selective' },
        { read_campaign_ids: { [Op.overlap]: Array.from(context.campaignIds) } },
      ],
    })
  }

  if (userId) {
    clauses.push({
      [Op.and]: [
        { read_access: 'selective' },
        { read_user_ids: { [Op.contains]: [userId] } },
      ],
    })
  }

  if (clauses.length === 0) {
    return { id: null }
  }

  return { [Op.or]: clauses }
}
