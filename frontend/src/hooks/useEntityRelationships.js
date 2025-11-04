import { useState, useEffect, useMemo, useCallback } from 'react'
import { getEntityRelationships } from '../api/entityRelationships.js'
import { createDefaultRelationshipFilters } from '../components/entities/EntityRelationshipFilters.jsx'

/** Helper for filter key generation (mirrors EntityDetailPage logic) */
const buildFilterKey = (idValue, name, fallbackLabel = '') => {
  if (idValue !== undefined && idValue !== null) {
    const trimmed = String(idValue).trim()
    if (trimmed) return trimmed
  }

  if (name !== undefined && name !== null) {
    const trimmed = String(name).trim()
    if (trimmed) return `name:${trimmed.toLowerCase()}`
  }

  if (fallbackLabel) {
    const trimmed = String(fallbackLabel).trim()
    if (trimmed) {
      const normalized = trimmed
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
      return `label:${normalized || 'fallback'}`
    }
  }

  return ''
}

/** Main hook */
export default function useEntityRelationships(entity, token) {
  const [relationships, setRelationships] = useState([])
  const [relationshipsError, setRelationshipsError] = useState('')
  const [relationshipsLoading, setRelationshipsLoading] = useState(false)
  const [filters, setFilters] = useState(() => createDefaultRelationshipFilters())

  const entityId = entity?.id ? String(entity.id) : ''

  /** Load relationships for entity */
  const loadRelationships = useCallback(async () => {
    if (!entityId || !token) return
    setRelationshipsLoading(true)
    setRelationshipsError('')

    try {
      const response = await getEntityRelationships(entityId)
      const list = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
        ? response.data
        : []
      setRelationships(list)
    } catch (err) {
      console.error('❌ Failed to load relationships', err)
      setRelationships([])
      setRelationshipsError(err.message || 'Failed to load relationships')
    } finally {
      setRelationshipsLoading(false)
    }
  }, [entityId, token])

  useEffect(() => {
    loadRelationships()
  }, [loadRelationships])

  /** Normalise relationship records */
  const normalisedRelationships = useMemo(() => {
    if (!Array.isArray(relationships)) return []

    const normaliseId = (value) => {
      if (!value) return ''
      if (typeof value === 'string' || typeof value === 'number') return String(value).trim()
      if (typeof value === 'object') {
        return String(value.id || value.entity_id || value.entityId || '').trim()
      }
      return ''
    }

    return relationships.map((r) => ({
      id: r.id,
      typeId: normaliseId(r.relationship_type_id || r.relationshipTypeId || r.typeId || r.type),
      typeName: r.relationshipType?.name || r.type?.name || '—',
      fromId: normaliseId(r.from_entity_id || r.fromEntityId || r.from),
      toId: normaliseId(r.to_entity_id || r.toEntityId || r.to),
      fromName: r.from_entity?.name || r.from?.name || '—',
      toName: r.to_entity?.name || r.to?.name || '—',
      fromEntityTypeName: r.from_entity_type?.name || r.fromEntityTypeName || '',
      toEntityTypeName: r.to_entity_type?.name || r.toEntityTypeName || '',
      direction: r.context?.__direction === 'reverse' ? 'reverse' : 'forward',
    }))
  }, [relationships])

  /** Sort and filter */
  const sortedRelationships = useMemo(() => {
    const entityIdString = entityId || ''
    return normalisedRelationships
      .filter((r) => r.fromId === entityIdString || r.toId === entityIdString)
      .sort((a, b) => {
        const aRelated = a.fromId === entityIdString ? a.toName : a.fromName
        const bRelated = b.fromId === entityIdString ? b.toName : b.fromName
        return aRelated.localeCompare(bRelated, undefined, { sensitivity: 'base' })
      })
  }, [normalisedRelationships, entityId])

  /** Filter option derivation */
  const relationshipFilterOptions = useMemo(() => {
    const typeMap = new Map()
    const relatedTypeMap = new Map()
    const entityIdString = entityId || ''

    sortedRelationships.forEach((r) => {
      const typeLabel = r.typeName || 'Unknown type'
      const typeKey = buildFilterKey(r.typeId, r.typeName, typeLabel)
      if (typeKey && !typeMap.has(typeKey)) typeMap.set(typeKey, typeLabel)

      const isSource = r.fromId === entityIdString
      const relatedLabel = isSource ? r.toEntityTypeName : r.fromEntityTypeName
      const relatedKey = buildFilterKey(null, relatedLabel, relatedLabel)
      if (relatedKey && !relatedTypeMap.has(relatedKey)) relatedTypeMap.set(relatedKey, relatedLabel)
    })

    const relationshipTypes = Array.from(typeMap.entries()).map(([value, label]) => ({ value, label }))
    const relatedEntityTypes = Array.from(relatedTypeMap.entries()).map(([value, label]) => ({ value, label }))

    return { relationshipTypes, relatedEntityTypes }
  }, [sortedRelationships, entityId])

  /** Filtered relationships */
  const filteredRelationships = useMemo(() => {
    const typeFilter = filters.relationshipTypes || { mode: 'all', values: [] }
    const relatedFilter = filters.relatedEntityTypes || { mode: 'all', values: [] }
    const entityIdString = entityId || ''

    return sortedRelationships.filter((r) => {
      const typeKey = buildFilterKey(r.typeId, r.typeName, r.typeName)
      if (typeFilter.mode !== 'all' && typeFilter.values.length) {
        const match = typeKey && typeFilter.values.includes(typeKey)
        if (typeFilter.mode === 'include' && !match) return false
        if (typeFilter.mode === 'exclude' && match) return false
      }

      if (relatedFilter.mode !== 'all' && relatedFilter.values.length) {
        const isSource = r.fromId === entityIdString
        const relatedLabel = isSource ? r.toEntityTypeName : r.fromEntityTypeName
        const relatedKey = buildFilterKey(null, relatedLabel, relatedLabel)
        const match = relatedKey && relatedFilter.values.includes(relatedKey)
        if (relatedFilter.mode === 'include' && !match) return false
        if (relatedFilter.mode === 'exclude' && match) return false
      }

      return true
    })
  }, [sortedRelationships, filters, entityId])

  /** Filter change handlers */
  const handleFiltersChange = useCallback((nextFilters) => {
    if (!nextFilters || typeof nextFilters !== 'object') {
      setFilters(createDefaultRelationshipFilters())
    } else {
      setFilters(nextFilters)
    }
  }, [])

  const handleFiltersReset = useCallback(() => {
    setFilters(createDefaultRelationshipFilters())
  }, [])

  return {
    relationships,
    relationshipsLoading,
    relationshipsError,
    filteredRelationships,
    relationshipFilterOptions,
    filters,
    handleFiltersChange,
    handleFiltersReset,
    reloadRelationships: loadRelationships,
  }
}
