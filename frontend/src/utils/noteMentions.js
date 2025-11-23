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
    
    // Support both entity and location mentions
    const entityId = mention.entityId ?? mention.entity_id ?? mention.id ?? mention.entityID ?? null
    const locationId = mention.locationId ?? mention.location_id ?? null
    const mentionType = mention.type ?? mention.mentionType ?? (locationId ? 'location' : 'entity')
    
    const key = entityId || locationId
    if (!key) return
    const id = String(key)
    
    // Use a composite key to avoid collisions between entity and location IDs
    const lookupKey = `${mentionType}:${id}`
    if (mentionLookup.has(lookupKey)) return
    
    const label =
      mention.entityName ??
      mention.entity_name ??
      mention.locationName ??
      mention.location_name ??
      mention.label ??
      mention.name
    const name = label ? cleanEntityName(label) : ''
    
    if (mentionType === 'location') {
      mentionLookup.set(lookupKey, {
        locationId: id,
        locationName: name,
        type: 'location',
      })
      // Also store by ID for backward compatibility
      mentionLookup.set(id, {
        locationId: id,
        locationName: name,
        type: 'location',
      })
    } else {
      mentionLookup.set(lookupKey, {
        entityId: id,
        entityName: name,
        type: 'entity',
      })
      // Also store by ID for backward compatibility
      mentionLookup.set(id, {
        entityId: id,
        entityName: name,
        type: 'entity',
      })
    }
  })

  const segments = []
  const regex = /@\[(.+?)]\(([^)]+)\)/g
  let lastIndex = 0
  let match

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', text: text.slice(lastIndex, match.index) })
    }

    const rawMentionId = String(match[2])
    const rawFallback = match[1]
    const fallbackName = cleanEntityName(rawFallback) || String(rawFallback ?? '')
    
    // Check if the mention ID has a type prefix (entity:UUID or location:UUID)
    let mentionId = rawMentionId
    let mentionType = null
    
    if (rawMentionId.includes(':')) {
      const parts = rawMentionId.split(':')
      if (parts.length === 2) {
        mentionType = parts[0] // 'entity' or 'location'
        mentionId = parts[1] // The actual UUID
      }
    }
    
    // Try to find the mention in the lookup (check both with and without type prefix)
    let mention = mentionLookup.get(mentionId)
    
    // If we have a type prefix but didn't find it, try the prefixed key
    if (!mention && mentionType) {
      mention = mentionLookup.get(`${mentionType}:${mentionId}`)
    }
    
    // If not found, try to determine type from the mention list or use the prefix
    if (!mention) {
      const foundMention = mentions.find((m) => {
        const eId = m.entityId ?? m.entity_id ?? m.id ?? m.entityID
        const lId = m.locationId ?? m.location_id
        return String(eId) === mentionId || String(lId) === mentionId
      })
      
      if (foundMention) {
        const resolvedType = foundMention.type ?? foundMention.mentionType ?? (foundMention.locationId || foundMention.location_id ? 'location' : 'entity')
        if (resolvedType === 'location') {
          mention = {
            locationId: mentionId,
            locationName: fallbackName,
            type: 'location',
          }
        } else {
          mention = {
            entityId: mentionId,
            entityName: fallbackName,
            type: 'entity',
          }
        }
      } else if (mentionType === 'location') {
        // Use the type prefix from the saved content
        mention = {
          locationId: mentionId,
          locationName: fallbackName,
          type: 'location',
        }
      } else {
        // Default to entity for backward compatibility
        mention = {
          entityId: mentionId,
          entityName: fallbackName,
          type: 'entity',
        }
      }
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
