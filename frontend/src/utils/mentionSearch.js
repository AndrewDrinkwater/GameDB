import { searchEntities } from '../api/entities.js'
import { fetchLocations } from '../api/locations.js'
import { cleanEntityName } from './noteMentions.js'

/**
 * Unified mention search that searches both entities and locations
 * @param {Object} params - Search parameters
 * @param {string} params.worldId - World ID to search in
 * @param {string} params.query - Search query
 * @param {number} params.limit - Maximum number of results per type (default: 4)
 * @param {Function} params.callback - Callback function to receive results
 */
export const searchMentions = async ({ worldId, query, limit = 4, callback }) => {
  const trimmedQuery = query?.trim() ?? ''
  if (typeof callback !== 'function') {
    return
  }

  if (!worldId || trimmedQuery.length === 0) {
    callback([])
    return
  }

  try {
    // Search both entities and locations in parallel
    const [entitiesResponse, locationsResponse] = await Promise.all([
      searchEntities({
        worldId,
        query: trimmedQuery,
        limit,
      }).catch(() => ({ data: [] })),
      fetchLocations({
        worldId,
        // Note: fetchLocations doesn't have a query parameter, so we'll filter client-side
        // In the future, we might want to add a search endpoint for locations
      }).catch((err) => {
        console.error('Failed to fetch locations for mention search', err)
        return { data: [] }
      }),
    ])

    const entities = Array.isArray(entitiesResponse?.data)
      ? entitiesResponse.data
      : Array.isArray(entitiesResponse)
        ? entitiesResponse
        : []
    
    // Handle locations response - check various response formats
    let locations = []
    if (locationsResponse) {
      // Check if it's wrapped in a data property with success flag
      if (locationsResponse?.success && Array.isArray(locationsResponse?.data)) {
        locations = locationsResponse.data
      } else if (Array.isArray(locationsResponse?.data)) {
        locations = locationsResponse.data
      } else if (Array.isArray(locationsResponse)) {
        locations = locationsResponse
      }
    }

    // Format entities with type prefix
    const formattedEntities = entities
      .map((entity) => {
        const entityId = entity?.id ?? entity?.entity?.id
        if (!entityId) return null
        const rawName =
          entity?.name ||
          entity?.displayName ||
          entity?.entity?.name ||
          'Unnamed entity'
        const display = cleanEntityName(rawName) || 'Unnamed entity'
        // Use type prefix format: entity:UUID
        return { id: `entity:${entityId}`, display, type: 'entity' }
      })
      .filter(Boolean)

    // Format locations with type prefix (filter by query client-side since fetchLocations doesn't support search)
    const queryLower = trimmedQuery.toLowerCase()
    const formattedLocations = (Array.isArray(locations) ? locations : [])
      .filter((location) => {
        if (!location || typeof location !== 'object') return false
        const name = String(location?.name || '').trim()
        if (!name) return false
        return name.toLowerCase().includes(queryLower)
      })
      .slice(0, limit)
      .map((location) => {
        if (!location || typeof location !== 'object') return null
        const locationId = location?.id
        if (!locationId) return null
        const rawName = String(location?.name || '').trim() || 'Unnamed location'
        const display = cleanEntityName(rawName) || 'Unnamed location'
        // Use type prefix format: location:UUID
        return { id: `location:${locationId}`, display, type: 'location' }
      })
      .filter(Boolean)

    // Combine and sort by display name
    const combined = [...formattedEntities, ...formattedLocations].sort((a, b) =>
      a.display.localeCompare(b.display),
    )

    callback(combined)
  } catch (err) {
    console.error('Failed to search mentions', err)
    callback([])
  }
}

export default searchMentions

