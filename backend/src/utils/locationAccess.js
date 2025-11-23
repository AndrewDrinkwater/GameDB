import { Op } from 'sequelize'
import { buildEntityReadContext } from './entityAccess.js'

const toPlainLocation = (location) =>
  typeof location?.get === 'function' ? location.get({ plain: true }) : location ?? {}

const normaliseIdList = (value) => {
  if (!Array.isArray(value)) return []
  return value
    .filter((entry) => entry !== null && entry !== undefined)
    .map((entry) => String(entry))
    .filter(Boolean)
}

export const buildLocationReadContext = buildEntityReadContext

export const canUserWriteLocation = (locationInput, context) => {
  const location = toPlainLocation(locationInput)
  const writeAccess = location.write_access ?? 'global'
  const writeCampaignIds = normaliseIdList(location.write_campaign_ids)
  const writeUserIds = normaliseIdList(location.write_user_ids)

  const rawUserId = context?.userId ?? null
  const suppressPersonalAccess = Boolean(context?.suppressPersonalAccess)
  const userId = suppressPersonalAccess ? null : rawUserId
  const isAdmin = Boolean(context?.isAdmin)
  const isOwner = Boolean(context?.isOwner)
  const worldAccess = context?.worldAccess ?? null
  const hasWorldAccess = Boolean(worldAccess?.hasAccess)
  const campaignIds = context?.campaignIds ?? new Set()
  const hasWorldCharacter = Boolean(context?.hasWorldCharacter)
  const activeCampaignId = context?.activeCampaignId ? String(context.activeCampaignId) : null

  const createdBy = location.created_by ?? location.createdBy ?? location.createdById ?? null
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

export const canUserReadLocation = (locationInput, context) => {
  const location = toPlainLocation(locationInput)
  if (!location) return false

  const readAccess = location.read_access ?? 'global'
  const readCampaignIds = normaliseIdList(location.read_campaign_ids)
  const readUserIds = normaliseIdList(location.read_user_ids)
  const readCharacterIds = normaliseIdList(location.read_character_ids)

  const viewAs = context?.viewAs ?? null
  const isViewAs = Boolean(viewAs)
  const baseUserId = isViewAs ? viewAs?.userId ?? null : context?.userId ?? null
  const suppressPersonalAccess = isViewAs ? false : Boolean(context?.suppressPersonalAccess)
  const userId = suppressPersonalAccess ? null : baseUserId
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

  const createdBy = location.created_by ?? location.createdBy ?? location.createdById ?? null
  const isCreator = Boolean(userId && createdBy && String(createdBy) === String(userId))

  if (isAdmin || isOwner || isCreator) {
    return true
  }

  if (!isViewAs && canUserWriteLocation(location, context)) {
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

export const buildReadableLocationsWhereClause = (context) => {
  const viewAs = context?.viewAs ?? null
  const isViewAs = Boolean(viewAs)
  const isAdmin = isViewAs ? false : Boolean(context?.isAdmin)
  const isOwner = isViewAs ? false : Boolean(context?.isOwner)

  if (!context || isAdmin || isOwner) {
    return null
  }

  const clauses = []
  const baseUserId = isViewAs ? viewAs?.userId ?? null : context.userId ?? null
  const suppressPersonalAccess = isViewAs ? false : Boolean(context?.suppressPersonalAccess)
  const userId = suppressPersonalAccess ? null : baseUserId
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
  }

  if (clauses.length === 0) {
    return null
  }

  return { [Op.or]: clauses }
}

