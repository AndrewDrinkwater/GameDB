const READ_ACCESS_VALUES = new Set(['global', 'selective', 'hidden', 'unchanged'])
const WRITE_ACCESS_VALUES = new Set(['global', 'selective', 'hidden', 'owner_only', 'unchanged'])
export const MAX_BULK_ENTITY_IDS = 1000

export class BulkAccessValidationError extends Error {
  constructor(message, options = {}) {
    super(message)
    this.name = 'BulkAccessValidationError'
    this.status = options.status || 400
    this.suggestedFix = options.suggestedFix || null
    this.meta = options.meta || {}
  }
}

const toUniqueStringList = (input) => {
  if (!Array.isArray(input)) return []
  const seen = new Set()
  const values = []
  input.forEach((value) => {
    if (value === undefined || value === null) return
    const normalised = String(value).trim()
    if (!normalised || seen.has(normalised)) return
    seen.add(normalised)
    values.push(normalised)
  })
  return values
}

const requireArray = (value, field) => {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) {
    throw new BulkAccessValidationError(`${field} must be an array`)
  }
  return toUniqueStringList(value)
}

const normaliseAccessMode = (value, field) => {
  if (typeof value !== 'string') {
    throw new BulkAccessValidationError(`${field} is required`)
  }
  const trimmed = value.trim().toLowerCase()
  const allowed = field === 'writeAccess' ? WRITE_ACCESS_VALUES : READ_ACCESS_VALUES
  if (!allowed.has(trimmed)) {
    throw new BulkAccessValidationError(
      `${field} must be one of: ${Array.from(allowed).join(', ')}`,
    )
  }
  return trimmed
}

const clampDescription = (value) => {
  if (value === undefined || value === null) return null
  const trimmed = String(value).trim()
  if (!trimmed) return null
  if (trimmed.length > 500) {
    throw new BulkAccessValidationError('Description must be 500 characters or less')
  }
  return trimmed
}

const normaliseEntityIds = (input) => {
  if (!Array.isArray(input)) {
    throw new BulkAccessValidationError('entityIds must be an array of ids')
  }
  const values = toUniqueStringList(input)
  if (values.length === 0) {
    throw new BulkAccessValidationError('Select at least one entity to update')
  }
  if (values.length > MAX_BULK_ENTITY_IDS) {
    throw new BulkAccessValidationError(
      `You can only update ${MAX_BULK_ENTITY_IDS} entities at a time`,
    )
  }
  return values
}

export const normaliseBulkAccessPayload = (input = {}) => {
  const entityIds = normaliseEntityIds(input.entityIds)
  const readAccess = normaliseAccessMode(input.readAccess ?? input.read_access, 'readAccess')
  const writeAccess = normaliseAccessMode(input.writeAccess ?? input.write_access, 'writeAccess')

  if (readAccess === 'unchanged' && writeAccess === 'unchanged') {
    throw new BulkAccessValidationError('Select at least one access type to update.')
  }

  if (readAccess !== 'unchanged' && readAccess === 'hidden' && writeAccess === 'selective') {
    throw new BulkAccessValidationError(
      'Hidden read access cannot be paired with selective write access',
      { suggestedFix: 'Choose owner_only or hidden write access' },
    )
  }

  const writeCampaignIds = requireArray(input.writeCampaignIds ?? input.write_campaign_ids, 'writeCampaignIds')
  const writeUserIds = requireArray(input.writeUserIds ?? input.write_user_ids, 'writeUserIds')
  const readCampaignIds = requireArray(input.readCampaignIds ?? input.read_campaign_ids, 'readCampaignIds')
  const readUserIds = requireArray(input.readUserIds ?? input.read_user_ids, 'readUserIds')
  const readCharacterIds = requireArray(
    input.readCharacterIds ?? input.read_character_ids,
    'readCharacterIds',
  )

  const mergedReadCampaignIds = Array.from(new Set([...readCampaignIds, ...writeCampaignIds]))
  const mergedReadUserIds = Array.from(new Set([...readUserIds, ...writeUserIds]))

  const writeTargetCount = writeCampaignIds.length + writeUserIds.length
  if (writeAccess === 'selective' && writeTargetCount === 0) {
    throw new BulkAccessValidationError(
      'Selective write access requires at least one campaign or user',
    )
  }
  if (writeAccess === 'unchanged' && writeTargetCount > 0) {
    throw new BulkAccessValidationError('Write access set to unchanged cannot include targets')
  }

  const readTargetCount = mergedReadCampaignIds.length + mergedReadUserIds.length + readCharacterIds.length
  if (readAccess === 'selective' && readTargetCount === 0) {
    throw new BulkAccessValidationError(
      'Selective read access requires at least one campaign, user, or character',
    )
  }
  if (readAccess === 'unchanged' && readTargetCount > 0) {
    throw new BulkAccessValidationError('Read access set to unchanged cannot include targets')
  }

  return {
    entityIds,
    readAccess,
    writeAccess,
    readCampaignIds: mergedReadCampaignIds,
    readUserIds: mergedReadUserIds,
    readCharacterIds,
    writeCampaignIds,
    writeUserIds,
    description: clampDescription(input.description),
  }
}

const toStringList = (value) => {
  if (!Array.isArray(value)) return []
  return value
    .filter((entry) => entry !== undefined && entry !== null)
    .map((entry) => String(entry).trim())
    .filter(Boolean)
}

const buildSortedList = (existing, additions = []) => {
  const next = new Set(toStringList(existing))
  additions.forEach((entry) => {
    if (entry) next.add(String(entry))
  })
  return Array.from(next)
}

const toPlainEntity = (entity) => {
  if (entity && typeof entity.get === 'function') {
    return entity.get({ plain: true })
  }
  return entity || {}
}

export const buildEntityAccessUpdate = (entityInput, payload) => {
  const entity = toPlainEntity(entityInput)

  const readCampaignIds = buildSortedList(entity.read_campaign_ids, [
    ...(payload.readCampaignIds || []),
    ...(payload.writeCampaignIds || []),
  ])
  const readUserIds = buildSortedList(entity.read_user_ids, [
    ...(payload.readUserIds || []),
    ...(payload.writeUserIds || []),
  ])
  const readCharacterIds = buildSortedList(entity.read_character_ids, payload.readCharacterIds)
  const writeCampaignIds = buildSortedList(entity.write_campaign_ids, payload.writeCampaignIds)
  const writeUserIds = buildSortedList(entity.write_user_ids, payload.writeUserIds)

  const updates = {
    read_campaign_ids: readCampaignIds,
    read_user_ids: readUserIds,
    read_character_ids: readCharacterIds,
    write_campaign_ids: writeCampaignIds,
    write_user_ids: writeUserIds,
  }

  if (payload.readAccess && payload.readAccess !== 'unchanged') {
    updates.read_access = payload.readAccess
  }
  if (payload.writeAccess && payload.writeAccess !== 'unchanged') {
    updates.write_access = payload.writeAccess
  }

  return updates
}
