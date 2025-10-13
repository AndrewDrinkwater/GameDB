import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getWorldEntities } from '../../api/entities.js'
import {
  createRelationship,
  getRelationship,
  updateRelationship,
} from '../../api/entityRelationships.js'
import { getRelationshipTypes } from '../../api/entityRelationshipTypes.js'
import { getEntityTypes } from '../../api/entityTypes.js'
import EntityMiniCreateInline from '../../components/EntityMiniCreateInline.jsx'

const normaliseValueForInput = (value) => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return ''
    }
  }
  return String(value)
}

const coerceContextValue = (value) => {
  const trimmed = value.trim()
  if (!trimmed) return ''

  if (trimmed === 'true') return true
  if (trimmed === 'false') return false

  const firstChar = trimmed[0]
  const lastChar = trimmed[trimmed.length - 1]
  if ((firstChar === '{' && lastChar === '}') || (firstChar === '[' && lastChar === ']')) {
    try {
      return JSON.parse(trimmed)
    } catch {
      return value
    }
  }

  const numeric = Number(trimmed)
  if (!Number.isNaN(numeric) && trimmed !== '') {
    return numeric
  }

  return value
}

const joinWithConjunction = (items) => {
  if (!Array.isArray(items) || items.length === 0) return ''
  if (items.length === 1) return items[0]
  if (items.length === 2) return `${items[0]} or ${items[1]}`
  const initial = items.slice(0, -1)
  const last = items[items.length - 1]
  return `${initial.join(', ')}, or ${last}`
}
const normaliseEntityRecord = (entity) => {
  if (!entity || entity.id === undefined || entity.id === null) return null
  const entityTypeId =
    entity.entity_type_id ??
    entity.entityTypeId ??
    entity.entity_type?.id ??
    entity.entityType?.id ??
    null
  const entityType =
    entity.entityType ||
    entity.entity_type ||
    (entityTypeId && entity.entity_type_name
      ? { id: entityTypeId, name: entity.entity_type_name }
      : null)

  return {
    ...entity,
    id: entity.id,
    name: entity.name || 'Untitled entity',
    entity_type_id: entityTypeId,
    entityType,
  }
}

const resolveTypeName = (entry) =>
  entry?.name || entry?.entityType?.name || entry?.entity_type?.name || ''

const getEntityTypeEntriesForRole = (type, role) => {
  if (!type) return []

  const rawList =
    role === 'from'
      ? type?.from_entity_types ?? type?.fromEntityTypes ?? type?.fromTypes ?? []
      : type?.to_entity_types ?? type?.toEntityTypes ?? type?.toTypes ?? []

  if (!Array.isArray(rawList)) return []

  return rawList
}

const resolveRuleId = (entry) => {
  if (!entry) return ''

  if (typeof entry === 'string' || typeof entry === 'number') {
    const trimmed = String(entry).trim()
    return trimmed
  }

  if (typeof entry === 'object') {
    if (entry.id !== undefined && entry.id !== null) return String(entry.id)
    if (entry.entity_type_id !== undefined && entry.entity_type_id !== null)
      return String(entry.entity_type_id)
    if (entry.entityTypeId !== undefined && entry.entityTypeId !== null)
      return String(entry.entityTypeId)
    if (entry.entityType?.id !== undefined && entry.entityType?.id !== null)
      return String(entry.entityType.id)
    if (entry.entity_type?.id !== undefined && entry.entity_type?.id !== null)
      return String(entry.entity_type.id)
  }

  return ''
}

const getEntityTypeIdsForRole = (type, role) =>
  getEntityTypeEntriesForRole(type, role)
    .map((entry) => resolveRuleId(entry))
    .filter((value) => value !== '')

export default function EntityRelationshipForm({
  worldId,
  relationshipId,
  onCancel,
  onSaved,
  onToast,
  defaultFromEntityId,
  lockFromEntity = false,
  formId = 'relationship-form',
  onStateChange,
  hideActions = false,
}) {
  const isEditMode = Boolean(relationshipId)
  const showEntityHelperHints = isEditMode
  const showContextEditor = isEditMode
  const pairIdRef = useRef(0)

  const generatePair = useCallback(
    (key = '', value = '') => {
      pairIdRef.current += 1
      return { id: pairIdRef.current, key, value }
    },
    [],
  )

  const ensureAtLeastOnePair = useCallback(
    (pairs) => {
      if (pairs.length > 0) return pairs
      return [generatePair()]
    },
    [generatePair],
  )

  const resolveDirection = useCallback((context) => {
    if (!context || typeof context !== 'object' || Array.isArray(context)) {
      return ''
    }
    const value = context.__direction || context.direction
    return value ? String(value) : ''
  }, [])

  const normalisePairsFromContext = useCallback(
    (context) => {
      pairIdRef.current = 0
      if (!context || typeof context !== 'object' || Array.isArray(context)) {
        return [generatePair()]
      }

      const entries = Object.entries(context).filter(([key]) => {
        if (typeof key !== 'string') return true
        return !key.startsWith('__')
      })
      if (entries.length === 0) {
        return [generatePair()]
      }

      return entries.map(([key, value]) => generatePair(key, normaliseValueForInput(value)))
    },
    [generatePair],
  )

  const [entities, setEntities] = useState([])
  const [relationshipTypes, setRelationshipTypes] = useState([])
  const [entityTypes, setEntityTypes] = useState([])
  const [values, setValues] = useState({
    fromEntityId: defaultFromEntityId ? String(defaultFromEntityId) : '',
    toEntityId: '',
    relationshipTypeId: '',
    bidirectional: true,
  })
  const [contextPairs, setContextPairs] = useState(() => {
    pairIdRef.current = 0
    return [generatePair()]
  })
  const [direction, setDirection] = useState('forward')
  const [loadingEntities, setLoadingEntities] = useState(false)
  const [loadingTypes, setLoadingTypes] = useState(false)
  const [loadingEntityTypes, setLoadingEntityTypes] = useState(false)
  const [loadingRelationship, setLoadingRelationship] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [creatingRole, setCreatingRole] = useState(null)
  const highlightTimersRef = useRef({ from: null, to: null })
  const [highlightedEntities, setHighlightedEntities] = useState({ from: '', to: '' })

  const hasContext = useMemo(
    () => contextPairs.some((pair) => pair.key.trim() !== '' || pair.value.trim() !== ''),
    [contextPairs],
  )

  useEffect(() => {
    let cancelled = false

    if (!worldId) {
      setEntities([])
      return () => {}
    }

    const loadEntities = async () => {
      setLoadingEntities(true)
      try {
        const response = await getWorldEntities(worldId)
        const list = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
            ? response.data
            : []
        if (!cancelled) {
          setEntities(list)
        }
      } catch (err) {
        if (!cancelled) {
          setEntities([])
          setError(err.message || 'Failed to load entities')
        }
      } finally {
        if (!cancelled) {
          setLoadingEntities(false)
        }
      }
    }

    loadEntities()
    return () => {
      cancelled = true
    }
  }, [worldId])

  useEffect(() => {
    let cancelled = false

    if (!worldId) {
      setRelationshipTypes([])
      setLoadingTypes(false)
      return () => {}
    }

    const loadTypes = async () => {
      setLoadingTypes(true)
      try {
        const response = await getRelationshipTypes({ worldId })
        const list = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
            ? response.data
            : []
        if (!cancelled) {
          setRelationshipTypes(list)
        }
      } catch (err) {
        if (!cancelled) {
          setRelationshipTypes([])
          setError(err.message || 'Failed to load relationship types')
        }
      } finally {
        if (!cancelled) {
          setLoadingTypes(false)
        }
      }
    }

    loadTypes()
    return () => {
      cancelled = true
    }
  }, [worldId])

  useEffect(() => {
    let cancelled = false

    const loadTypes = async () => {
      setLoadingEntityTypes(true)
      try {
        const response = await getEntityTypes()
        const list = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
            ? response.data
            : []
        if (!cancelled) {
          setEntityTypes(list)
        }
      } catch (err) {
        if (!cancelled) {
          setEntityTypes([])
          setError((prev) => prev || err.message || 'Failed to load entity types')
        }
      } finally {
        if (!cancelled) {
          setLoadingEntityTypes(false)
        }
      }
    }

    loadTypes()
    return () => {
      cancelled = true
    }
  }, [])

  const resolveEntityTypeId = (entity) => {
    if (!entity) return ''
    const candidate =
      entity.entity_type_id ??
      entity.entityTypeId ??
      entity.entityType?.id ??
      entity.entity_type?.id ??
      ''
    return candidate ? String(candidate) : ''
  }

  const selectedFromEntity = useMemo(() => {
    if (!values.fromEntityId) return null
    return entities.find((entity) => String(entity.id) === String(values.fromEntityId)) || null
  }, [entities, values.fromEntityId])

  const selectedFromEntityTypeId = useMemo(
    () => resolveEntityTypeId(selectedFromEntity),
    [selectedFromEntity],
  )

  const selectedFromEntityTypeName = useMemo(() => {
    if (!selectedFromEntity) return ''
    return (
      selectedFromEntity.entityType?.name ||
      selectedFromEntity.entity_type?.name ||
      selectedFromEntity.entity_type_name ||
      ''
    )
  }, [selectedFromEntity])

  const availableRelationshipTypes = useMemo(() => {
    if (!relationshipTypes?.length) return []
    if (!selectedFromEntityTypeId) return relationshipTypes

    const selectedId = String(selectedFromEntityTypeId)

    return relationshipTypes.filter((type) => {
      const sourceIds = getEntityTypeIdsForRole(type, 'from')
      const targetIds = getEntityTypeIdsForRole(type, 'to')

      if (sourceIds.length === 0 && targetIds.length === 0) {
        return true
      }

      return sourceIds.includes(selectedId) || targetIds.includes(selectedId)
    })
  }, [relationshipTypes, selectedFromEntityTypeId])

  const activeRelationshipType = useMemo(() => {
    if (!values.relationshipTypeId) return null
    return relationshipTypes.find(
      (type) => String(type.id) === String(values.relationshipTypeId),
    )
  }, [relationshipTypes, values.relationshipTypeId])

  const allowedFromTypeIds = useMemo(() => {
    if (!activeRelationshipType) return []
    const role = direction === 'reverse' ? 'to' : 'from'
    return getEntityTypeIdsForRole(activeRelationshipType, role)
  }, [activeRelationshipType, direction])

  const allowedToTypeIds = useMemo(() => {
    if (!activeRelationshipType) return []
    const role = direction === 'reverse' ? 'from' : 'to'
    return getEntityTypeIdsForRole(activeRelationshipType, role)
  }, [activeRelationshipType, direction])

  const suggestedFromTypeId = useMemo(
    () => (allowedFromTypeIds.length > 0 ? String(allowedFromTypeIds[0]) : ''),
    [allowedFromTypeIds],
  )

  const suggestedToTypeId = useMemo(
    () => (allowedToTypeIds.length > 0 ? String(allowedToTypeIds[0]) : ''),
    [allowedToTypeIds],
  )

  const handleInlineCreateRequest = useCallback(
    (role) => {
      if (role === 'from') {
        if (lockFromEntity) return
        if (!allowedFromTypeIds.length) {
          onToast?.('This entity type is not allowed for this relationship.', 'warning')
          return
        }
      } else if (!allowedToTypeIds.length) {
        onToast?.('This entity type is not allowed for this relationship.', 'warning')
        return
      }

      setCreatingRole(role)
    },
    [allowedFromTypeIds.length, allowedToTypeIds.length, lockFromEntity, onToast],
  )

  useEffect(() => {
    if (creatingRole === 'from' && allowedFromTypeIds.length === 0) {
      setCreatingRole(null)
    } else if (creatingRole === 'to' && allowedToTypeIds.length === 0) {
      setCreatingRole(null)
    }
  }, [creatingRole, allowedFromTypeIds.length, allowedToTypeIds.length])

  const filteredFromEntities = useMemo(() => {
    if (!allowedFromTypeIds.length) return entities
    const allowedSet = new Set(allowedFromTypeIds)
    return entities.filter((entity) => allowedSet.has(resolveEntityTypeId(entity)))
  }, [entities, allowedFromTypeIds])

  const filteredToEntities = useMemo(() => {
    if (!allowedToTypeIds.length) return entities
    const allowedSet = new Set(allowedToTypeIds)
    return entities.filter((entity) => allowedSet.has(resolveEntityTypeId(entity)))
  }, [entities, allowedToTypeIds])

  useEffect(() => {
    if (!values.relationshipTypeId) return
    const exists = availableRelationshipTypes.some(
      (type) => String(type.id) === String(values.relationshipTypeId),
    )
    if (!exists) {
      setValues((prev) => ({ ...prev, relationshipTypeId: '' }))
    }
  }, [availableRelationshipTypes, values.relationshipTypeId])

  useEffect(() => {
    if (!values.relationshipTypeId || !selectedFromEntityTypeId) return

    const selectedId = String(selectedFromEntityTypeId)
    const activeType = relationshipTypes.find(
      (type) => String(type.id) === String(values.relationshipTypeId),
    )
    if (!activeType) return

    const sourceIds = getEntityTypeIdsForRole(activeType, 'from')
    const targetIds = getEntityTypeIdsForRole(activeType, 'to')

    const allowsSource = sourceIds.includes(selectedId)
    const allowsTarget = targetIds.includes(selectedId)

    if (allowsSource && allowsTarget) return

    if (allowsSource && direction !== 'forward') {
      setDirection('forward')
      return
    }

    if (!allowsSource && allowsTarget) {
      if (direction !== 'reverse') {
        setDirection('reverse')
      }
      return
    }

    if (!allowsSource && !allowsTarget) {
      setValues((prev) => ({ ...prev, relationshipTypeId: '' }))
    }
  }, [
    values.relationshipTypeId,
    selectedFromEntityTypeId,
    relationshipTypes,
    direction,
  ])

  useEffect(() => {
    if (!values.fromEntityId) return
    if (!allowedFromTypeIds.length) return
    const allowedSet = new Set(allowedFromTypeIds)
    const selected = entities.find((entity) => String(entity.id) === String(values.fromEntityId))
    if (!selected) return
    const entityTypeId = resolveEntityTypeId(selected)
    if (!entityTypeId || !allowedSet.has(entityTypeId)) {
      setValues((prev) => ({ ...prev, fromEntityId: '' }))
    }
  }, [allowedFromTypeIds, entities, values.fromEntityId])

  useEffect(() => {
    if (!values.toEntityId) return
    if (!allowedToTypeIds.length) return
    const allowedSet = new Set(allowedToTypeIds)
    const selected = entities.find((entity) => String(entity.id) === String(values.toEntityId))
    if (!selected) return
    const entityTypeId = resolveEntityTypeId(selected)
    if (!entityTypeId || !allowedSet.has(entityTypeId)) {
      setValues((prev) => ({ ...prev, toEntityId: '' }))
    }
  }, [allowedToTypeIds, entities, values.toEntityId])

  const fromTypeSummary = useMemo(() => {
    if (!activeRelationshipType) return ''
    const role = direction === 'reverse' ? 'to' : 'from'
    const sourceList = getEntityTypeEntriesForRole(activeRelationshipType, role)
    if (!sourceList.length) return ''
    return sourceList
      .map((entry) => entry?.name || entry?.entityType?.name || entry?.entity_type?.name || 'Unknown type')
      .join(', ')
  }, [activeRelationshipType, direction])

  const toTypeSummary = useMemo(() => {
    if (!activeRelationshipType) return ''
    const role = direction === 'reverse' ? 'from' : 'to'
    const targetList = getEntityTypeEntriesForRole(activeRelationshipType, role)
    if (!targetList.length) return ''
    return targetList
      .map((entry) => entry?.name || entry?.entityType?.name || entry?.entity_type?.name || 'Unknown type')
      .join(', ')
  }, [activeRelationshipType, direction])

  const effectiveFromLabel = useMemo(() => {
    if (!activeRelationshipType) return ''
    const label =
      direction === 'reverse'
        ? activeRelationshipType.to_name || activeRelationshipType.toName
        : activeRelationshipType.from_name || activeRelationshipType.fromName
    return label || ''
  }, [activeRelationshipType, direction])

  const effectiveToLabel = useMemo(() => {
    if (!activeRelationshipType) return ''
    const label =
      direction === 'reverse'
        ? activeRelationshipType.from_name || activeRelationshipType.fromName
        : activeRelationshipType.to_name || activeRelationshipType.toName
    return label || ''
  }, [activeRelationshipType, direction])

  const fromTypeNames = useMemo(() => {
    if (!activeRelationshipType) return []
    const role = direction === 'reverse' ? 'to' : 'from'
    return getEntityTypeEntriesForRole(activeRelationshipType, role)
      .map((entry) => resolveTypeName(entry))
      .filter((name) => name && name.trim())
  }, [activeRelationshipType, direction])

  const toTypeNames = useMemo(() => {
    if (!activeRelationshipType) return []
    const role = direction === 'reverse' ? 'from' : 'to'
    return getEntityTypeEntriesForRole(activeRelationshipType, role)
      .map((entry) => resolveTypeName(entry))
      .filter((name) => name && name.trim())
  }, [activeRelationshipType, direction])

  const relationshipTypeHint = useMemo(() => {
    if (!activeRelationshipType) return ''
    if (!fromTypeNames.length && !toTypeNames.length) return ''

    if (fromTypeNames.length && toTypeNames.length) {
      return `This relationship can only be initiated from ${joinWithConjunction(
        fromTypeNames,
      )} and targets ${joinWithConjunction(toTypeNames)}.`
    }

    if (fromTypeNames.length) {
      return `This relationship can only be initiated from ${joinWithConjunction(fromTypeNames)}.`
    }

    return `This relationship targets ${joinWithConjunction(toTypeNames)}.`
  }, [activeRelationshipType, fromTypeNames, toTypeNames])

  const reverseHelperMessage = useMemo(() => {
    if (direction !== 'reverse') return ''
    const reverseLabel = effectiveFromLabel || effectiveToLabel || ''
    const contextTypeName =
      selectedFromEntityTypeName ||
      (fromTypeNames.length ? fromTypeNames[0] : '') ||
      'this entity type'

    if (reverseLabel) {
      return `Relationship reversed automatically based on context. Reverse label ‘${reverseLabel}’ is used when creating from a ${contextTypeName}.`
    }

    return 'Relationship reversed automatically based on context.'
  }, [direction, effectiveFromLabel, effectiveToLabel, fromTypeNames, selectedFromEntityTypeName])

  useEffect(() => {
    let cancelled = false

    const resetForm = () => {
      pairIdRef.current = 0
      setValues({
        fromEntityId: defaultFromEntityId ? String(defaultFromEntityId) : '',
        toEntityId: '',
        relationshipTypeId: '',
        bidirectional: true,
      })
      setContextPairs([generatePair()])
      setDirection('forward')
      setError('')
      setCreatingRole(null)
    }

    if (!isEditMode || !relationshipId) {
      resetForm()
      setLoadingRelationship(false)
      return () => {}
    }

    const loadRelationship = async () => {
      setLoadingRelationship(true)
      setError('')
      try {
        const response = await getRelationship(relationshipId)
        const data = response?.data || response
        if (!data) {
          throw new Error('Relationship not found')
        }

        if (!cancelled) {
          const fromEntityId =
            data.from_entity_id ||
            data.fromEntityId ||
            data.from_entity?.id ||
            data.fromEntity?.id ||
            ''
          const toEntityId =
            data.to_entity_id ||
            data.toEntityId ||
            data.to_entity?.id ||
            data.toEntity?.id ||
            ''
          const relationshipTypeId =
            data.entity_relationship_type_id ||
            data.relationship_type_id ||
            data.relationshipType?.id ||
            data.relationship_type?.id ||
            ''
          const bidirectional = Boolean(
            data.bidirectional ?? data.is_bidirectional ?? data.two_way,
          )

          setValues({
            fromEntityId: fromEntityId ? String(fromEntityId) : '',
            toEntityId: toEntityId ? String(toEntityId) : '',
            relationshipTypeId: relationshipTypeId ? String(relationshipTypeId) : '',
            bidirectional,
          })
          setDirection(resolveDirection(data.context) || 'forward')
          setContextPairs(ensureAtLeastOnePair(normalisePairsFromContext(data.context)))
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load relationship')
        }
      } finally {
        if (!cancelled) {
          setLoadingRelationship(false)
        }
      }
    }

    loadRelationship()
    return () => {
      cancelled = true
    }
  }, [
    relationshipId,
    isEditMode,
    ensureAtLeastOnePair,
    normalisePairsFromContext,
    generatePair,
    resolveDirection,
    defaultFromEntityId,
  ])

  useEffect(() => {
    if (!defaultFromEntityId || isEditMode) return
    const nextValue = String(defaultFromEntityId)
    setValues((prev) => {
      if (prev.fromEntityId === nextValue) return prev
      return { ...prev, fromEntityId: nextValue }
    })
  }, [defaultFromEntityId, isEditMode])

  const handleValueChange = (field) => (event) => {
    const { value } = event.target
    setValues((prev) => ({ ...prev, [field]: value }))
    if (field === 'relationshipTypeId') {
      setCreatingRole(null)
    }
  }

  const handleBidirectionalChange = (event) => {
    const { checked } = event.target
    setValues((prev) => ({ ...prev, bidirectional: checked }))
  }

  const handleFromEntityChange = (event) => {
    const { value } = event.target
    setCreatingRole((prev) => (prev === 'from' ? null : prev))
    setValues((prev) => ({ ...prev, fromEntityId: value }))
  }

  const handleToEntityChange = (event) => {
    const { value } = event.target
    setCreatingRole((prev) => (prev === 'to' ? null : prev))
    setValues((prev) => ({ ...prev, toEntityId: value }))
  }

  const handleInlineCancel = useCallback(() => {
    setCreatingRole(null)
  }, [])

  const triggerHighlight = useCallback((role, entityId) => {
    const key = role === 'to' ? 'to' : 'from'
    const nextId = entityId ? String(entityId) : ''
    setHighlightedEntities((prev) => ({ ...prev, [key]: nextId }))
    if (highlightTimersRef.current[key]) {
      clearTimeout(highlightTimersRef.current[key])
    }
    highlightTimersRef.current[key] = setTimeout(() => {
      setHighlightedEntities((prev) => ({ ...prev, [key]: '' }))
      highlightTimersRef.current[key] = null
    }, 2000)
  }, [])

  const handleInlineEntityCreated = useCallback(
    (role, entity) => {
      const normalised = normaliseEntityRecord(entity)
      if (!normalised) return

      setEntities((prev) => {
        const existingIndex = prev.findIndex(
          (entry) => String(entry.id) === String(normalised.id),
        )
        if (existingIndex >= 0) {
          const clone = [...prev]
          clone[existingIndex] = { ...clone[existingIndex], ...normalised }
          return clone
        }
        return [normalised, ...prev]
      })

      const nextId = String(normalised.id)
      if (role === 'from') {
        setValues((prev) => ({ ...prev, fromEntityId: nextId }))
      } else if (role === 'to') {
        setValues((prev) => ({ ...prev, toEntityId: nextId }))
      }

      triggerHighlight(role, nextId)
      setCreatingRole(null)
    },
    [triggerHighlight],
  )

  useEffect(() => {
    const timers = highlightTimersRef.current
    return () => {
      Object.values(timers).forEach((timer) => {
        if (timer) {
          clearTimeout(timer)
        }
      })
    }
  }, [])

  const handleContextChange = (id, field) => (event) => {
    const { value } = event.target
    setContextPairs((prev) => prev.map((pair) => (pair.id === id ? { ...pair, [field]: value } : pair)))
  }

  const handleAddPair = () => {
    setContextPairs((prev) => [...prev, generatePair()])
  }

  const handleRemovePair = (id) => {
    setContextPairs((prev) => ensureAtLeastOnePair(prev.filter((pair) => pair.id !== id)))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!worldId) {
      setError('Select a world before creating relationships.')
      return
    }

    const fromEntityId = values.fromEntityId.trim()
    const toEntityId = values.toEntityId.trim()
    const relationshipTypeId = values.relationshipTypeId.trim()

    if (!fromEntityId || !toEntityId) {
      setError('Both entities are required.')
      return
    }

    if (!relationshipTypeId) {
      setError('Relationship type is required.')
      return
    }

    const contextPayload = {}
    contextPairs.forEach(({ key, value }) => {
      const trimmedKey = key.trim()
      if (!trimmedKey) return
      if (trimmedKey.startsWith('__')) return
      contextPayload[trimmedKey] = coerceContextValue(value)
    })
    const payloadDirection = direction || 'forward'
    contextPayload.__direction = payloadDirection

    let payloadFromId = fromEntityId
    let payloadToId = toEntityId

    if (payloadDirection === 'reverse') {
      payloadFromId = toEntityId
      payloadToId = fromEntityId
    }

    const payload = {
      world_id: worldId,
      from_entity_id: payloadFromId,
      to_entity_id: payloadToId,
      relationship_type_id: relationshipTypeId,
      bidirectional: Boolean(values.bidirectional),
      context: contextPayload,
    }

    try {
      setSaving(true)
      setError('')
      if (isEditMode) {
        await updateRelationship(relationshipId, payload)
        onSaved?.('edit')
      } else {
        const response = await createRelationship(payload)
        const created = response?.data ?? response
        const mapped = created?.data ?? created
        onSaved?.('create', mapped)
      }
    } catch (err) {
      setError(err.message || 'Failed to save relationship')
    } finally {
      setSaving(false)
    }
  }

  const isBusy = loadingEntities || loadingTypes || loadingRelationship || loadingEntityTypes
  const noAvailableTypes =
    Boolean(selectedFromEntityTypeId) && availableRelationshipTypes.length === 0

  useEffect(() => {
    if (!onStateChange) return
    const mode = isEditMode ? 'edit' : 'create'
    onStateChange({
      mode,
      saving,
      isBusy,
      submitLabel: saving
        ? 'Saving...'
        : isEditMode
          ? 'Save Changes'
          : 'Create Relationship',
      submitDisabled: saving || isBusy,
      cancelDisabled: saving,
    })
  }, [onStateChange, isEditMode, saving, isBusy])

  return (
    <form
      id={formId}
      className="entity-form relationship-form"
      onSubmit={handleSubmit}
    >
      <div className="form-two-column">
        <div
          className={`form-group${
            highlightedEntities.from && highlightedEntities.from === values.fromEntityId
              ? ' entity-select-highlight'
              : ''
          }`}
        >
          <label htmlFor="relationship-from-entity">From Entity *</label>
          <select
            id="relationship-from-entity"
            value={values.fromEntityId}
            onChange={handleFromEntityChange}
            disabled={
              saving ||
              isBusy ||
              lockFromEntity
            }
            required
            data-autofocus={!lockFromEntity ? true : undefined}
          >
            <option value="">Select entity...</option>
            {filteredFromEntities.map((entity) => (
              <option key={entity.id} value={entity.id}>
                {entity.name}
              </option>
            ))}
          </select>
          {lockFromEntity && (
            <p className="field-hint">
              The source entity is locked for this relationship.
            </p>
          )}
          {showEntityHelperHints && effectiveFromLabel && (
            <p className="field-hint">Displayed label: {effectiveFromLabel}</p>
          )}
          {showEntityHelperHints && activeRelationshipType && fromTypeSummary && (
            <p className="field-hint">Allowed types: {fromTypeSummary}</p>
          )}
          {!lockFromEntity && (
            <div className="inline-create-trigger">
              {allowedFromTypeIds.length > 0 ? (
                <button
                  type="button"
                  className="link-button"
                  onClick={() => handleInlineCreateRequest('from')}
                  disabled={creatingRole === 'from'}
                >
                  + Create new
                </button>
              ) : (
                <button type="button" className="link-button disabled" disabled>
                  + Create new
                </button>
              )}
            </div>
          )}
          {!lockFromEntity && allowedFromTypeIds.length === 0 && (
            <p className="inline-create-hint disabled">
              Inline creation isn’t available for this relationship.
            </p>
          )}
          {activeRelationshipType && allowedFromTypeIds.length > 0 &&
            filteredFromEntities.length === 0 && (
              <p className="field-hint">
                No entities match the allowed source types yet. Use “+ Create new” to add one
                without leaving this page.
              </p>
            )}
          {!lockFromEntity && creatingRole === 'from' && (
            <EntityMiniCreateInline
              key={`inline-from-${values.relationshipTypeId}`}
              allowedTypeIds={allowedFromTypeIds}
              defaultTypeId={suggestedFromTypeId}
              worldId={worldId}
              entityTypes={entityTypes}
              onCreated={(entity) => handleInlineEntityCreated('from', entity)}
              onCancel={handleInlineCancel}
              onToast={onToast}
            />
          )}
        </div>

        <div className="form-group">
          <label htmlFor="relationship-type">Relationship Type *</label>
          <select
            id="relationship-type"
            value={values.relationshipTypeId}
            onChange={handleValueChange('relationshipTypeId')}
            disabled={saving || isBusy || !availableRelationshipTypes.length}
            required
          >
            <option value="">Select type...</option>
            {availableRelationshipTypes.map((type) => {
              const fromLabel = type.from_name || type.fromName || type.name
              const toLabel = type.to_name || type.toName || type.name
              const directionalSummary = fromLabel === toLabel ? fromLabel : `${fromLabel} → ${toLabel}`
              return (
                <option key={type.id} value={type.id}>
                  {type.name} · {directionalSummary}
                </option>
              )
            })}
          </select>
          {noAvailableTypes && (
            <p className="field-hint">
              No relationship types include the selected entity type.
            </p>
          )}
          {relationshipTypeHint && <p className="helper-hint">{relationshipTypeHint}</p>}
          {reverseHelperMessage && <p className="helper-hint">{reverseHelperMessage}</p>}
        </div>
      </div>

      <div className="form-two-column">
        <div
          className={`form-group${
            highlightedEntities.to && highlightedEntities.to === values.toEntityId
              ? ' entity-select-highlight'
              : ''
          }`}
        >
          <label htmlFor="relationship-to-entity">To Entity *</label>
          <select
            id="relationship-to-entity"
            value={values.toEntityId}
            onChange={handleToEntityChange}
            disabled={saving || isBusy}
            required
          >
            <option value="">Select entity...</option>
            {filteredToEntities.map((entity) => (
              <option key={entity.id} value={entity.id}>
                {entity.name}
              </option>
            ))}
          </select>
          {showEntityHelperHints && effectiveToLabel && (
            <p className="field-hint">Displayed label: {effectiveToLabel}</p>
          )}
          {showEntityHelperHints && activeRelationshipType && toTypeSummary && (
            <p className="field-hint">Allowed targets: {toTypeSummary}</p>
          )}
          <div className="inline-create-trigger">
            {allowedToTypeIds.length > 0 ? (
              <button
                type="button"
                className="link-button"
                onClick={() => handleInlineCreateRequest('to')}
                disabled={creatingRole === 'to'}
              >
                + Create new
              </button>
            ) : (
              <button type="button" className="link-button disabled" disabled>
                + Create new
              </button>
            )}
          </div>
          {allowedToTypeIds.length === 0 && (
            <p className="inline-create-hint disabled">
              Inline creation isn’t available for this relationship.
            </p>
          )}
          {activeRelationshipType && allowedToTypeIds.length > 0 && filteredToEntities.length === 0 && (
            <p className="field-hint">
              No entities match the allowed target types yet. Use “+ Create new” to add one without
              losing your place.
            </p>
          )}
          {creatingRole === 'to' && (
            <EntityMiniCreateInline
              key={`inline-to-${values.relationshipTypeId}`}
              allowedTypeIds={allowedToTypeIds}
              defaultTypeId={suggestedToTypeId}
              worldId={worldId}
              entityTypes={entityTypes}
              onCreated={(entity) => handleInlineEntityCreated('to', entity)}
              onCancel={handleInlineCancel}
              onToast={onToast}
            />
          )}
        </div>

        <div className="form-group checkbox">
          <label htmlFor="relationship-bidirectional">
            <input
              id="relationship-bidirectional"
              type="checkbox"
              checked={values.bidirectional}
              onChange={handleBidirectionalChange}
              disabled={saving || isBusy}
            />
            Bidirectional
          </label>
        </div>
      </div>

      {showContextEditor && (
        <div className="metadata-editor">
          <div className="metadata-header">
            <h3>Context {hasContext ? '' : '(optional)'}</h3>
            <button
              type="button"
              className="btn neutral"
              onClick={handleAddPair}
              disabled={saving || isBusy}
            >
              Add field
            </button>
          </div>

          <div className="metadata-list">
            {contextPairs.map((pair, index) => (
              <div className="metadata-row" key={pair.id}>
                <div className="form-group">
                  <label htmlFor={`context-key-${pair.id}`} className="sr-only">
                    Context key {index + 1}
                  </label>
                  <input
                    id={`context-key-${pair.id}`}
                    type="text"
                    placeholder="Key"
                    value={pair.key}
                    onChange={handleContextChange(pair.id, 'key')}
                    disabled={saving || isBusy}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor={`context-value-${pair.id}`} className="sr-only">
                    Context value {index + 1}
                  </label>
                  <input
                    id={`context-value-${pair.id}`}
                    type="text"
                    placeholder="Value"
                    value={pair.value}
                    onChange={handleContextChange(pair.id, 'value')}
                    disabled={saving || isBusy}
                  />
                </div>
                <div className="metadata-actions">
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => handleRemovePair(pair.id)}
                    disabled={saving || isBusy || contextPairs.length === 1}
                    title="Remove field"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isBusy && (
        <div className="form-loading" role="status">
          Loading data...
        </div>
      )}

      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}

      {!hideActions && (
        <div className="form-actions">
          <button type="button" className="btn cancel" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn submit" disabled={saving || isBusy}>
            {saving ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Relationship'}
          </button>
        </div>
      )}
    </form>
  )
}
