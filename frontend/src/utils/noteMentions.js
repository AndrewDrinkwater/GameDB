const uuidSuffixPattern = /\s*\(([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\)$/i
const uuidPattern = /\(([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\)/gi

export const cleanEntityName = (value) => {
  if (!value) return ''
  let trimmed = String(value).trim()
  trimmed = trimmed.replace(uuidSuffixPattern, '').trim()
  trimmed = trimmed.replace(uuidPattern, '').trim()
  return trimmed
}

export const buildNoteSegments = (content = '', mentionList = []) => {
  const text = typeof content === 'string' ? content : ''
  if (!text) return []

  const mentions = Array.isArray(mentionList) ? mentionList : []
  const mentionLookup = new Map()
  mentions.forEach((mention) => {
    if (!mention) return
    const key =
      mention.entityId ?? mention.entity_id ?? mention.id ?? mention.entityID ?? null
    if (!key) return
    const id = String(key)
    if (mentionLookup.has(id)) return
    const label =
      mention.entityName ?? mention.entity_name ?? mention.label ?? mention.name
    const entityName = label ? cleanEntityName(label) : ''
    mentionLookup.set(id, {
      entityId: id,
      entityName,
    })
  })

  const segments = []
  const regex = /@\[(.+?)]\(([^)]+)\)/g
  let lastIndex = 0
  let match

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', text: text.slice(lastIndex, match.index) })
    }

    const entityId = String(match[2])
    const rawFallback = match[1]
    const fallbackName = cleanEntityName(rawFallback) || String(rawFallback ?? '')
    const mention = mentionLookup.get(entityId) || {
      entityId,
      entityName: fallbackName,
    }

    segments.push({ type: 'mention', ...mention })
    lastIndex = regex.lastIndex
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', text: text.slice(lastIndex) })
  }

  return segments
}

export default buildNoteSegments
