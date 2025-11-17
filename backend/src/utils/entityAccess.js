import { Op } from 'sequelize'
import { Campaign, Character, UserCampaignRole } from '../models/index.js'

const toPlainEntity = (entity) =>
  typeof entity?.get === 'function' ? entity.get({ plain: true }) : entity ?? {}

const normaliseId = (value) => {
  if (!value) return null
  return typeof value === 'string' ? value : value.id ?? null
}

const normaliseIdList = (value) => {
  if (!Array.isArray(value)) return []
  return value
    .filter((entry) => entry !== null && entry !== undefined)
    .map((entry) => String(entry))
    .filter(Boolean)
}

export const fetchUserWorldCharacterCampaignIds = async (worldId, userId) => {
  if (!worldId || !userId) {
    return { campaignIds: new Set(), characterIds: new Set(), hasAnyCharacter: false }
  }

  const [characters, campaignRoles] = await Promise.all([
    Character.findAll({
      where: { user_id: userId },
      attributes: ['id', 'campaign_id'],
      include: [
        {
          model: Campaign,
          as: 'campaign',
          required: true,
          attributes: ['id'],
          where: { world_id: worldId },
        },
      ],
    }),
    UserCampaignRole.findAll({
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
    }),
  ])

  const campaignIds = new Set()
  const characterIds = new Set()

  const registerCampaignId = (campaignId) => {
    if (campaignId) {
      campaignIds.add(String(campaignId))
    }
  }

  characters.forEach((character) => {
    const plain = character.get({ plain: true })
    const campaignId = normaliseId(plain.campaign) ?? plain.campaign_id
    if (plain.id) {
      characterIds.add(String(plain.id))
    }
    registerCampaignId(campaignId)
  })

  campaignRoles.forEach((role) => {
    const plain = role.get({ plain: true })
    const campaignId = normaliseId(plain.campaign) ?? plain.campaign_id
    registerCampaignId(campaignId)
  })

  return {
    campaignIds,
    characterIds,
    hasAnyCharacter: characterIds.size > 0,
  }
}

const shouldSimulateWorldOwnerAsPlayer = async ({
  worldId,
  userId,
  campaignContextId,
  isOwner,
  isAdmin,
}) => {
  if (!isOwner || isAdmin) {
    return false
  }

  const resolvedWorldId = normaliseId(worldId)
  const resolvedUserId = normaliseId(userId)
  const resolvedCampaignId = normaliseId(campaignContextId)

  if (!resolvedWorldId || !resolvedUserId || !resolvedCampaignId) {
    return false
  }

  const membership = await UserCampaignRole.findOne({
    where: { user_id: resolvedUserId, campaign_id: resolvedCampaignId },
    attributes: ['role'],
    include: [
      {
        model: Campaign,
        as: 'campaign',
        required: true,
        attributes: ['id', 'world_id'],
      },
    ],
  })

  if (!membership || membership.role !== 'player') {
    return false
  }

  const membershipWorldId = normaliseId(membership.campaign?.world_id ?? membership.campaign?.world)
  if (!membershipWorldId) {
    return false
  }

  return String(membershipWorldId) === String(resolvedWorldId)
}

const normaliseCharacterContextId = (value) => {
  if (!value) return null
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed || null
  }
  if (typeof value === 'object') {
    return normaliseCharacterContextId(value.id ?? value.character_id)
  }
  const stringValue = String(value).trim()
  return stringValue || null
}

const resolveCharacterViewContext = async ({
  worldId,
  characterContextId,
  userId,
  isAdmin,
  isOwner,
}) => {
  const normalisedId = normaliseCharacterContextId(characterContextId)
  if (!normalisedId || !worldId || !userId) {
    return null
  }

  const character = await Character.findByPk(normalisedId, {
    attributes: ['id', 'campaign_id', 'user_id'],
    include: [
      {
        model: Campaign,
        as: 'campaign',
        attributes: ['id', 'world_id'],
      },
    ],
  })

  if (!character) {
    return null
  }

  const plain = character.get({ plain: true })
  const campaign = plain.campaign || {}
  const campaignWorldId = normaliseId(campaign.world_id ?? campaign.world)
  if (!campaignWorldId || String(campaignWorldId) !== String(worldId)) {
    return null
  }

  let canView = Boolean(isAdmin || isOwner)

  if (!canView) {
    const dmMembership = await UserCampaignRole.findOne({
      where: { user_id: userId, campaign_id: plain.campaign_id, role: 'dm' },
      attributes: ['id'],
    })
    canView = Boolean(dmMembership)
  }

  if (!canView) {
    return null
  }

  return {
    characterId: String(plain.id),
    campaignId: plain.campaign_id ? String(plain.campaign_id) : null,
    userId: plain.user_id ? String(plain.user_id) : null,
  }
}

export const buildEntityReadContext = async ({
  worldId,
  user,
  worldAccess,
  campaignContextId,
  characterContextId,
}) => {
  const resolvedWorldId = normaliseId(worldId)
  const userId = user?.id ?? null
  const isAdmin = Boolean(worldAccess?.isAdmin || user?.role === 'system_admin')
  const isOwner = Boolean(worldAccess?.isOwner)
  const providedContextId = normaliseId(campaignContextId)
  const normalisedContextId = providedContextId ? String(providedContextId) : null

  const simulateOwnerAsPlayer = await shouldSimulateWorldOwnerAsPlayer({
    worldId: resolvedWorldId,
    userId,
    campaignContextId: normalisedContextId,
    isOwner,
    isAdmin,
  })

  const effectiveIsOwner = simulateOwnerAsPlayer ? false : isOwner
  const effectiveIsAdmin = simulateOwnerAsPlayer ? false : isAdmin

  let campaignIds = new Set()
  let characterIds = new Set()
  let hasAnyCharacter = false
  let activeCampaignId = normalisedContextId

  if (userId && resolvedWorldId && !effectiveIsAdmin && !effectiveIsOwner) {
    const context = await fetchUserWorldCharacterCampaignIds(resolvedWorldId, userId)
    campaignIds = context.campaignIds
    characterIds = context.characterIds
    hasAnyCharacter = context.hasAnyCharacter
    activeCampaignId =
      normalisedContextId && campaignIds.has(normalisedContextId) ? normalisedContextId : null
  }

  const viewAs = await resolveCharacterViewContext({
    worldId,
    characterContextId,
    userId,
    isAdmin,
    isOwner,
  })

  return {
    userId,
    isAdmin: effectiveIsAdmin,
    isOwner: effectiveIsOwner,
    campaignIds,
    characterIds,
    hasWorldCharacter: viewAs ? Boolean(viewAs.characterId) : hasAnyCharacter,
    worldAccess: worldAccess ?? null,
    activeCampaignId,
    viewAs,
  }
}

export const canUserWriteEntity = (entityInput, context) => {
  const entity = toPlainEntity(entityInput)
  const writeAccess = entity.write_access ?? 'global'
  const writeCampaignIds = normaliseIdList(entity.write_campaign_ids)
  const writeUserIds = normaliseIdList(entity.write_user_ids)

  const userId = context?.userId ?? null
  const isAdmin = Boolean(context?.isAdmin)
  const isOwner = Boolean(context?.isOwner)
  const worldAccess = context?.worldAccess ?? null
  const hasWorldAccess = Boolean(worldAccess?.hasAccess)
  const campaignIds = context?.campaignIds ?? new Set()
  const hasWorldCharacter = Boolean(context?.hasWorldCharacter)
  const activeCampaignId = context?.activeCampaignId ? String(context.activeCampaignId) : null

  const createdBy = entity.created_by ?? entity.createdBy ?? entity.createdById ?? null
  const isCreator = Boolean(userId && createdBy && String(createdBy) === String(userId))

  if (isAdmin || isOwner || isCreator) {
    return true
  }

  if (!userId) {
    return false
  }

  if (writeUserIds.some((id) => String(id) === String(userId))) {
    return true
  }

  if (campaignIds.size > 0 && writeCampaignIds.length > 0) {
    const candidateCampaignId =
      activeCampaignId && campaignIds.has(activeCampaignId) ? activeCampaignId : null

    if (candidateCampaignId) {
      const matchesCampaign = writeCampaignIds.some((id) => String(id) === candidateCampaignId)
      if (matchesCampaign) {
        return true
      }
    }
  }

  if (writeAccess === 'global' || writeAccess === null) {
    return hasWorldAccess || hasWorldCharacter
  }

  if (writeAccess === 'owner_only') {
    return false
  }

  if (writeAccess === 'selective' || writeAccess === 'hidden') {
    return false
  }

  return false
}

export const canUserReadEntity = (entityInput, context) => {
  const entity = toPlainEntity(entityInput)
  if (!entity) return false

  const readAccess = entity.read_access ?? 'global'
  const readCampaignIds = normaliseIdList(entity.read_campaign_ids)
  const readUserIds = normaliseIdList(entity.read_user_ids)
  const readCharacterIds = normaliseIdList(entity.read_character_ids)

  const viewAs = context?.viewAs ?? null
  const isViewAs = Boolean(viewAs)
  const userId = isViewAs ? viewAs?.userId ?? null : context?.userId ?? null
  const isAdmin = isViewAs ? false : Boolean(context?.isAdmin)
  const isOwner = isViewAs ? false : Boolean(context?.isOwner)
  const worldAccess = context?.worldAccess ?? null
  const hasWorldAccess = isViewAs ? false : Boolean(worldAccess?.hasAccess)
  const campaignIds = isViewAs
    ? new Set(viewAs?.campaignId ? [String(viewAs.campaignId)] : [])
    : context?.campaignIds ?? new Set()
  const characterIds = isViewAs
    ? new Set(viewAs?.characterId ? [String(viewAs.characterId)] : [])
    : context?.characterIds ?? new Set()
  const hasWorldCharacter = isViewAs
    ? Boolean(viewAs?.characterId)
    : Boolean(context?.hasWorldCharacter)
  const activeCampaignId = isViewAs
    ? viewAs?.campaignId ?? null
    : context?.activeCampaignId
      ? String(context.activeCampaignId)
      : null

  const createdBy = entity.created_by ?? entity.createdBy ?? entity.createdById ?? null
  const isCreator = Boolean(userId && createdBy && String(createdBy) === String(userId))

  if (isAdmin || isOwner || isCreator) {
    return true
  }

  if (!isViewAs && canUserWriteEntity(entity, context)) {
    return true
  }

  if (!userId && characterIds.size === 0) {
    return false
  }

  if (readAccess === 'hidden') {
    return false
  }

  if (readAccess === 'global' || readAccess === null) {
    return hasWorldAccess || hasWorldCharacter
  }

  if (readAccess === 'selective') {
    if (userId && readUserIds.some((id) => String(id) === String(userId))) {
      return true
    }

    if (characterIds.size > 0 && readCharacterIds.length > 0) {
      const hasCharacterMatch = readCharacterIds.some((id) => characterIds.has(String(id)))
      if (hasCharacterMatch) {
        return true
      }
    }

    if (campaignIds.size > 0 && readCampaignIds.length > 0) {
      const candidateCampaignId =
        activeCampaignId && campaignIds.has(activeCampaignId) ? activeCampaignId : null

      if (!candidateCampaignId) {
        return false
      }

      return readCampaignIds.some((id) => String(id) === candidateCampaignId)
    }

    return false
  }

  return false
}

export const buildReadableEntitiesWhereClause = (context) => {
  const viewAs = context?.viewAs ?? null
  const isViewAs = Boolean(viewAs)
  const isAdmin = isViewAs ? false : Boolean(context?.isAdmin)
  const isOwner = isViewAs ? false : Boolean(context?.isOwner)

  if (!context || isAdmin || isOwner) {
    return null
  }

  const clauses = []
  const userId = isViewAs ? viewAs?.userId ?? null : context.userId ?? null
  const characterIds = isViewAs
    ? new Set(viewAs?.characterId ? [String(viewAs.characterId)] : [])
    : context.characterIds ?? new Set()

  if (userId) {
    clauses.push({ created_by: userId })
  }

  const hasWorldCharacter = isViewAs
    ? Boolean(viewAs?.characterId)
    : Boolean(context.hasWorldCharacter)
  const hasWorldAccess = isViewAs ? false : Boolean(context.worldAccess?.hasAccess)

  if (hasWorldCharacter || hasWorldAccess) {
    clauses.push({
      [Op.or]: [
        { read_access: 'global' },
        { read_access: { [Op.is]: null } },
        { write_access: 'global' },
      ],
    })
  }

  const activeCampaignId = isViewAs
    ? viewAs?.campaignId ?? null
    : context.activeCampaignId
      ? String(context.activeCampaignId)
      : null

  if (activeCampaignId) {
    clauses.push({
      [Op.and]: [
        { read_access: 'selective' },
        { read_campaign_ids: { [Op.contains]: [activeCampaignId] } },
      ],
    })
    clauses.push({ write_campaign_ids: { [Op.contains]: [activeCampaignId] } })
  }

  if (characterIds.size > 0) {
    clauses.push({
      [Op.and]: [
        { read_access: 'selective' },
        { read_character_ids: { [Op.overlap]: Array.from(characterIds).map((id) => String(id)) } },
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
    clauses.push({ write_user_ids: { [Op.contains]: [userId] } })
  }

  if (clauses.length === 0) {
    return { id: null }
  }

  return { [Op.or]: clauses }
}
