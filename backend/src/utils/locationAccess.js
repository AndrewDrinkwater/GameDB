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

  // Logging for access determination
  const locationName = location.name || location.id || 'Unknown'
  const logPrefix = `[Location Access] "${locationName}" (${location.id}):`

  if (isAdmin || isOwner || isCreator) {
    if (isAdmin) {
      console.log(`${logPrefix} ✅ Access granted - User is ADMIN`)
    } else if (isOwner) {
      console.log(`${logPrefix} ✅ Access granted - User is WORLD OWNER`)
    } else if (isCreator) {
      console.log(`${logPrefix} ✅ Access granted - User is CREATOR (userId: ${userId})`)
    }
    return true
  }

  if (!isViewAs && canUserWriteLocation(location, context)) {
    console.log(`${logPrefix} ✅ Access granted - User has WRITE ACCESS`)
    return true
  }

  if (!userId && characterIds.size === 0) {
    console.log(`${logPrefix} ❌ Access denied - No user ID or character IDs`)
    return false
  }

  if (readAccess === 'hidden') {
    console.log(`${logPrefix} ❌ Access denied - Location is HIDDEN`)
    return false
  }

  if (readAccess === 'global' || readAccess === null) {
    if (hasWorldAccess || hasWorldCharacter) {
      const reason = hasWorldAccess ? 'WORLD ACCESS' : 'WORLD CHARACTER'
      console.log(`${logPrefix} ✅ Access granted - ${reason} (read_access: global)`)
      return true
    } else {
      console.log(`${logPrefix} ❌ Access denied - Global access but no world access/character`)
      return false
    }
  }

  if (readAccess === 'selective') {
    if (userId && readUserIds.some((id) => String(id) === String(userId))) {
      console.log(`${logPrefix} ✅ Access granted - User ID in read_user_ids (selective access)`)
      return true
    }

    if (characterIds.size > 0 && readCharacterIds.length > 0) {
      const hasCharacterMatch = readCharacterIds.some((id) => characterIds.has(String(id)))
      if (hasCharacterMatch) {
        const matchingChars = Array.from(characterIds).filter(id => readCharacterIds.includes(String(id)))
        console.log(`${logPrefix} ✅ Access granted - Character ID(s) match: ${matchingChars.join(', ')} (selective access)`)
        return true
      }
    }

    if (campaignIds.size > 0 && readCampaignIds.length > 0) {
      const candidateCampaignId =
        activeCampaignId && campaignIds.has(activeCampaignId) ? activeCampaignId : null

      if (!candidateCampaignId) {
        console.log(`${logPrefix} ❌ Access denied - Selective access: activeCampaignId (${activeCampaignId}) not in user's campaigns (${Array.from(campaignIds).join(', ')})`)
        return false
      }

      const hasCampaignMatch = readCampaignIds.some((id) => String(id) === candidateCampaignId)
      if (hasCampaignMatch) {
        console.log(`${logPrefix} ✅ Access granted - Campaign ID matches: ${candidateCampaignId} (selective access, read_campaign_ids: ${readCampaignIds.join(', ')})`)
        return true
      } else {
        console.log(`${logPrefix} ❌ Access denied - Selective access: Campaign ${candidateCampaignId} not in read_campaign_ids (${readCampaignIds.join(', ')})`)
        return false
      }
    }

    console.log(`${logPrefix} ❌ Access denied - Selective access but no matching user/character/campaign (read_user_ids: ${readUserIds.join(', ')}, read_character_ids: ${readCharacterIds.join(', ')}, read_campaign_ids: ${readCampaignIds.join(', ')})`)
    return false
  }

  console.log(`${logPrefix} ❌ Access denied - Unknown read_access value: ${readAccess}`)
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

