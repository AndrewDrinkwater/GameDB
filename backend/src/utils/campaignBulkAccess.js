import { BulkAccessValidationError } from './bulkAccessValidation.js'

const toPlainEntity = (entity) =>
  typeof entity?.get === 'function' ? entity.get({ plain: true }) : entity ?? {}

const toStringArray = (value) => {
  if (!Array.isArray(value)) return []
  return value
    .filter((entry) => entry !== null && entry !== undefined)
    .map((entry) => String(entry))
    .filter(Boolean)
}

const toStringSet = (value) => new Set(toStringArray(value))

export const ensureEntitiesVisibleToCampaign = (entities, { campaignId, campaignCharacterIds }) => {
  const requiredCampaignId = String(campaignId)
  const characterIds = campaignCharacterIds instanceof Set ? campaignCharacterIds : toStringSet(campaignCharacterIds)

  for (const entity of entities) {
    const plain = toPlainEntity(entity)
    const readAccess = plain.read_access ?? 'global'
    const readCampaignIds = toStringArray(plain.read_campaign_ids)
    const readCharacterIds = toStringArray(plain.read_character_ids)

    const visibleViaCampaign = readCampaignIds.some((id) => id === requiredCampaignId)
    const visibleViaCharacters = readCharacterIds.some((id) => characterIds.has(id))
    const visibleGlobally = readAccess === 'global'

    if (!visibleGlobally && !visibleViaCampaign && !visibleViaCharacters) {
      throw new BulkAccessValidationError('Entity is not visible to this campaign', {
        status: 403,
        meta: { entityId: plain.id },
        suggestedFix: 'Select entities that the campaign can already view',
      })
    }
  }
}

export const ensurePayloadWithinCampaignScope = (
  payload,
  { campaignId, memberUserIds, campaignCharacterIds },
) => {
  const allowedCampaignId = String(campaignId)
  const allowedUsers = memberUserIds instanceof Set ? memberUserIds : toStringSet(memberUserIds)
  const allowedCharacters =
    campaignCharacterIds instanceof Set ? campaignCharacterIds : toStringSet(campaignCharacterIds)

  const allReadCampaignIds = toStringArray(payload.readCampaignIds)
  const allWriteCampaignIds = toStringArray(payload.writeCampaignIds)

  const invalidCampaignId = [...allReadCampaignIds, ...allWriteCampaignIds].find(
    (id) => id !== allowedCampaignId,
  )

  if (invalidCampaignId) {
    throw new BulkAccessValidationError('You can only grant access to this campaign', {
      status: 403,
      meta: { campaignId: invalidCampaignId },
    })
  }

  const readUserIds = toStringArray(payload.readUserIds)
  const writeUserIds = toStringArray(payload.writeUserIds)
  const readCharacterIds = toStringArray(payload.readCharacterIds)

  const invalidWriteUser = writeUserIds.find((id) => !allowedUsers.has(id))
  if (invalidWriteUser) {
    throw new BulkAccessValidationError('Cannot grant write access to users outside this campaign', {
      status: 403,
      meta: { userId: invalidWriteUser },
    })
  }

  const invalidReadUser = readUserIds.find((id) => !allowedUsers.has(id))
  if (invalidReadUser) {
    throw new BulkAccessValidationError('Read access can only include this campaign’s members', {
      status: 403,
      meta: { userId: invalidReadUser },
    })
  }

  const invalidCharacter = readCharacterIds.find((id) => !allowedCharacters.has(id))
  if (invalidCharacter) {
    throw new BulkAccessValidationError('Characters must belong to this campaign', {
      status: 403,
      meta: { characterId: invalidCharacter },
    })
  }
}
