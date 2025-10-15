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
import EntitySelect from '../../components/EntitySelectAdapter.jsx'
import PerspectiveToggle from '../../components/relationships/PerspectiveToggle.jsx'
import { computeFilterParams } from '../../utils/relationshipPerspective.js'

const normaliseId = (value) => {
  if (value === undefined || value === null) return ''
  const trimmed = String(value).trim()
  return trimmed
}

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
  defaultToEntityId,
  lockToEntity = false,
  defaultPerspective = 'source',
  currentEntityId,
  currentEntityTypeId,
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

  const resolvedDefaultFromId = normaliseId(defaultFromEntityId)
  const resolvedDefaultToId = normaliseId(defaultToEntityId)
  const resolvedCurrentEntityId = normaliseId(currentEntityId)
  const resolvedCurrentEntityTypeId = normaliseId(currentEntityTypeId)
  const isGlobalMode = !resolvedCurrentEntityId && !lockFromEntity && !lockToEntity
  const initialDirection = defaultPerspective === 'target' ? 'reverse' : 'forward'
  const initialFromValue = initialDirection === 'forward' ? resolvedDefaultFromId : ''
  const initialToValue = initialDirection === 'reverse' ? resolvedDefaultToId : ''

  const [entities, setEntities] = useState([])
  const [relationshipTypes, setRelationshipTypes] = useState([])
  const [entityTypes, setEntityTypes] = useState([])
  const [values, setValues] = useState({
    fromEntityId: initialFromValue,
    toEntityId: initialToValue,
    relationshipTypeId: '',
  })
  const [contextPairs, setContextPairs] = useState(() => {
    pairIdRef.current = 0
    return [generatePair()]
  })
  const [direction, setDirection] = useState(initialDirection)
  const [loadingEntities, setLoadingEntities] = useState(false)
  const [loadingTypes, setLoadingTypes] = useState(false)
  const [loadingEntityTypes, setLoadingEntityTypes] = useState(false)
  const [loadingRelationship, setLoadingRelationship] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [autoCorrectionMessage, setAutoCorrectionMessage] = useState('')
  const [creatingRole, setCreatingRole] = useState(null)
  const highlightTimersRef = useRef({ from: null, to: null })
  const [highlightedEntities, setHighlightedEntities] = useState({ from: '', to: '' })
  const perspective = direction === 'reverse' ? 'target' : 'source'
  const isSourcePerspective = perspective === 'source'
  const lockedField = useMemo(() => {
    if (perspective === 'target') {
      if (lockToEntity) return 'to'
      if (lockFromEntity) return 'from'
      return ''
    }
    if (lockFromEntity) return 'from'
    if (lockToEntity) return 'to'
    return ''
  }, [lockFromEntity, lockToEntity, perspective])
  const editableField = lockedField === 'from' ? 'to' : lockedField === 'to' ? 'from' : ''

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

  const selectedToEntity = useMemo(() => {
    if (!values.toEntityId) return null
    return entities.find((entity) => String(entity.id) === String(values.toEntityId)) || null
  }, [entities, values.toEntityId])

  const selectedToEntityTypeId = useMemo(
    () => resolveEntityTypeId(selectedToEntity),
    [selectedToEntity],
  )

  const lockedEntityTypeId = useMemo(() => {
    if (lockedField === 'from') {
      if (selectedFromEntityTypeId) return selectedFromEntityTypeId
      if (
        resolvedCurrentEntityId &&
        values.fromEntityId === resolvedCurrentEntityId &&
        resolvedCurrentEntityTypeId
      ) {
        return resolvedCurrentEntityTypeId
      }
      if (
        resolvedDefaultFromId &&
        values.fromEntityId === resolvedDefaultFromId &&
        resolvedCurrentEntityTypeId
      ) {
        return resolvedCurrentEntityTypeId
      }
      return ''
    }
    if (lockedField === 'to') {
      if (selectedToEntityTypeId) return selectedToEntityTypeId
      if (
        resolvedCurrentEntityId &&
        values.toEntityId === resolvedCurrentEntityId &&
        resolvedCurrentEntityTypeId
      ) {
        return resolvedCurrentEntityTypeId
      }
      if (
        resolvedDefaultToId &&
        values.toEntityId === resolvedDefaultToId &&
        resolvedCurrentEntityTypeId
      ) {
        return resolvedCurrentEntityTypeId
      }
      return ''
    }
    return ''
  }, [
    lockedField,
    selectedFromEntityTypeId,
    selectedToEntityTypeId,
    values.fromEntityId,
    values.toEntityId,
    resolvedCurrentEntityId,
    resolvedCurrentEntityTypeId,
    resolvedDefaultFromId,
    resolvedDefaultToId,
  ])

  const { fromRoleForTypes, toRoleForTypes, typeFilterContext } = useMemo(
    () =>
      computeFilterParams({
        direction,
        lockedField,
        lockedEntityTypeId,
        selectedFromEntityTypeId,
        selectedToEntityTypeId,
      }),
    [
      direction,
      lockedField,
      lockedEntityTypeId,
      selectedFromEntityTypeId,
      selectedToEntityTypeId,
    ],
  )

  const availableRelationshipTypes = useMemo(() => {
    if (!relationshipTypes?.length) return []

    const ensureAllowed = (list, role, entityTypeId) => {
      if (!entityTypeId) return list
      const targetId = String(entityTypeId)
      return list.filter((type) => {
        const allowedIds = getEntityTypeIdsForRole(type, role)
        if (allowedIds.length === 0) {
          return true
        }
        return allowedIds.includes(targetId)
      })
    }

    let filtered = relationshipTypes

    if (typeFilterContext) {
      const { typeId, role } = typeFilterContext
      filtered = ensureAllowed(filtered, role, typeId)
    }

    filtered = ensureAllowed(filtered, fromRoleForTypes, selectedFromEntityTypeId)
    filtered = ensureAllowed(filtered, toRoleForTypes, selectedToEntityTypeId)

    return filtered
  }, [
    relationshipTypes,
    typeFilterContext,
    fromRoleForTypes,
    toRoleForTypes,
    selectedFromEntityTypeId,
    selectedToEntityTypeId,
  ])

  const activeRelationshipType = useMemo(() => {
    if (!values.relationshipTypeId) return null
    return relationshipTypes.find(
      (type) => String(type.id) === String(values.relationshipTypeId),
    )
  }, [relationshipTypes, values.relationshipTypeId])

  const allowedFromTypeIds = useMemo(() => {
    if (!activeRelationshipType) return []
    return getEntityTypeIdsForRole(activeRelationshipType, fromRoleForTypes)
  }, [activeRelationshipType, fromRoleForTypes])

  const allowedToTypeIds = useMemo(() => {
    if (!activeRelationshipType) return []
    return getEntityTypeIdsForRole(activeRelationshipType, toRoleForTypes)
  }, [activeRelationshipType, toRoleForTypes])

  const suggestedFromTypeId = useMemo(
    () => (allowedFromTypeIds.length > 0 ? String(allowedFromTypeIds[0]) : ''),
    [allowedFromTypeIds],
  )

  const suggestedToTypeId = useMemo(
    () => (allowedToTypeIds.length > 0 ? String(allowedToTypeIds[0]) : ''),
    [allowedToTypeIds],
  )

  const handlePerspectiveChange = (nextPerspective) => {
    const desiredDirection = nextPerspective === 'target' ? 'reverse' : 'forward'
    setAutoCorrectionMessage('')

    if (direction !== desiredDirection) {
      setValues((prev) => {
        const updates = { ...prev, relationshipTypeId: '' }

        if (!isEditMode) {
          const fallbackId = resolvedCurrentEntityId || ''
          if (desiredDirection === 'reverse') {
            const lockedId = resolvedDefaultToId || fallbackId
            if (lockedId) {
              updates.toEntityId = lockedId
              if (lockFromEntity && prev.fromEntityId === lockedId) {
                updates.fromEntityId = ''
              }
            }
          } else {
            const lockedId = resolvedDefaultFromId || fallbackId
            if (lockedId) {
              updates.fromEntityId = lockedId
              if (lockToEntity && prev.toEntityId === lockedId) {
                updates.toEntityId = ''
              }
            }
          }
        }

        return updates
      })
    }

    setDirection((prev) => {
      if (prev === desiredDirection) return prev
      return desiredDirection
    })
  }

  const handleInlineCreateRequest = useCallback(
    (role) => {
      if (role === 'from') {
        if (lockedField === 'from') return
        if (!allowedFromTypeIds.length) {
          onToast?.('This entity type is not allowed for this relationship.', 'warning')
          return
        }
      } else if (lockedField === 'to') {
        return
      } else if (!allowedToTypeIds.length) {
        onToast?.('This entity type is not allowed for this relationship.', 'warning')
        return
      }

      setCreatingRole(role)
    },
    [allowedFromTypeIds.length, allowedToTypeIds.length, lockedField, onToast],
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

    if (lockFromEntity || lockToEntity || resolvedCurrentEntityId) {
      setAutoCorrectionMessage('')
      return
    }

    const selectedId = String(selectedFromEntityTypeId)
    const activeType = relationshipTypes.find(
      (type) => String(type.id) === String(values.relationshipTypeId),
    )
    if (!activeType) return

    const sourceIds = getEntityTypeIdsForRole(activeType, 'from')
    const targetIds = getEntityTypeIdsForRole(activeType, 'to')

    const allowsSource = sourceIds.includes(selectedId)
    const allowsTarget = targetIds.includes(selectedId)

    if (allowsSource && allowsTarget) {
      setAutoCorrectionMessage('')
      return
    }

    if (allowsSource && direction !== 'forward') {
      setDirection('forward')
      setAutoCorrectionMessage('')
      return
    }

    if (!allowsSource && allowsTarget) {
      const message =
        'Direction auto-corrected because this entity is only allowed as a target.'
      if (direction !== 'reverse') {
        setDirection('reverse')
        setAutoCorrectionMessage(message)
      } else {
        setAutoCorrectionMessage((prev) => (prev ? prev : message))
      }
      return
    }

    if (!allowsSource && !allowsTarget) {
      setAutoCorrectionMessage('')
      setValues((prev) => ({ ...prev, relationshipTypeId: '' }))
    }
  }, [
    values.relationshipTypeId,
    selectedFromEntityTypeId,
    relationshipTypes,
    direction,
    lockFromEntity,
    lockToEntity,
    resolvedCurrentEntityId,
  ])

  useEffect(() => {
    if (!values.fromEntityId) return
    if (!allowedFromTypeIds.length) return
    if (lockedField === 'from') return
    const allowedSet = new Set(allowedFromTypeIds)
    const selected = entities.find((entity) => String(entity.id) === String(values.fromEntityId))
    if (!selected) return
    const entityTypeId = resolveEntityTypeId(selected)
    if (!entityTypeId || !allowedSet.has(entityTypeId)) {
      setValues((prev) => ({ ...prev, fromEntityId: '' }))
    }
  }, [allowedFromTypeIds, entities, values.fromEntityId, lockedField])

  useEffect(() => {
    if (!values.toEntityId) return
    if (!allowedToTypeIds.length) return
    if (lockedField === 'to') return
    const allowedSet = new Set(allowedToTypeIds)
    const selected = entities.find((entity) => String(entity.id) === String(values.toEntityId))
    if (!selected) return
    const entityTypeId = resolveEntityTypeId(selected)
    if (!entityTypeId || !allowedSet.has(entityTypeId)) {
      setValues((prev) => ({ ...prev, toEntityId: '' }))
    }
  }, [allowedToTypeIds, entities, values.toEntityId, lockedField])

  const fromTypeSummary = useMemo(() => {
    if (!activeRelationshipType) return ''
    const sourceList = getEntityTypeEntriesForRole(activeRelationshipType, fromRoleForTypes)
    if (!sourceList.length) return ''
    return sourceList
      .map((entry) => entry?.name || entry?.entityType?.name || entry?.entity_type?.name || 'Unknown type')
      .join(', ')
  }, [activeRelationshipType, fromRoleForTypes])

  const toTypeSummary = useMemo(() => {
    if (!activeRelationshipType) return ''
    const targetList = getEntityTypeEntriesForRole(activeRelationshipType, toRoleForTypes)
    if (!targetList.length) return ''
    return targetList
      .map((entry) => entry?.name || entry?.entityType?.name || entry?.entity_type?.name || 'Unknown type')
      .join(', ')
  }, [activeRelationshipType, toRoleForTypes])

  const fromRoleLabel = fromRoleForTypes === 'from' ? 'source' : 'target'
  const toRoleLabel = toRoleForTypes === 'from' ? 'source' : 'target'
  const fromAllowedLabel = `Allowed ${fromRoleLabel}s`
  const toAllowedLabel = `Allowed ${toRoleLabel}s`

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
    return getEntityTypeEntriesForRole(activeRelationshipType, fromRoleForTypes)
      .map((entry) => resolveTypeName(entry))
      .filter((name) => name && name.trim())
  }, [activeRelationshipType, fromRoleForTypes])

  const toTypeNames = useMemo(() => {
    if (!activeRelationshipType) return []
    return getEntityTypeEntriesForRole(activeRelationshipType, toRoleForTypes)
      .map((entry) => resolveTypeName(entry))
      .filter((name) => name && name.trim())
  }, [activeRelationshipType, toRoleForTypes])

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

  const perspectiveWarning = useMemo(() => {
    if (!lockedField) return ''
    if (!activeRelationshipType) return ''
    const lockedTypeId = lockedEntityTypeId ? String(lockedEntityTypeId) : ''
    if (!lockedTypeId) return ''

    if (lockedField === 'from') {
      if (allowedFromTypeIds.length > 0 && !allowedFromTypeIds.includes(lockedTypeId)) {
        return isSourcePerspective
          ? 'This entity is not an allowed source for the selected relationship type. Try switching perspective.'
          : 'This entity is not an allowed target for the selected relationship type. Try switching perspective.'
      }
    } else if (lockedField === 'to') {
      if (allowedToTypeIds.length > 0 && !allowedToTypeIds.includes(lockedTypeId)) {
        return isSourcePerspective
          ? 'This entity is not an allowed target for the selected relationship type. Try switching perspective.'
          : 'This entity is not an allowed source for the selected relationship type. Try switching perspective.'
      }
    }

    return ''
  }, [
    lockedField,
    activeRelationshipType,
    lockedEntityTypeId,
    allowedFromTypeIds,
    allowedToTypeIds,
    isSourcePerspective,
  ])

  const lockedFieldHint = useMemo(() => {
    if (!lockedField) return ''
    if (lockedField === 'from') {
      return isSourcePerspective
        ? 'This entity is fixed as the source for this relationship.'
        : 'This field is locked to the current entity.'
    }
    if (lockedField === 'to') {
      return isSourcePerspective
        ? 'This field is locked to the current entity.'
        : 'This entity is fixed as the target for this relationship.'
    }
    return ''
  }, [lockedField, isSourcePerspective])

  const isPerspectiveInvalid = Boolean(perspectiveWarning)

  useEffect(() => {
    let cancelled = false

    const resetForm = () => {
      pairIdRef.current = 0
      setValues({
        fromEntityId: initialDirection === 'forward' ? resolvedDefaultFromId : '',
        toEntityId: initialDirection === 'reverse' ? resolvedDefaultToId : '',
        relationshipTypeId: '',
      })
      setContextPairs([generatePair()])
      setDirection(initialDirection)
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
          setValues({
            fromEntityId: fromEntityId ? String(fromEntityId) : '',
            toEntityId: toEntityId ? String(toEntityId) : '',
            relationshipTypeId: relationshipTypeId ? String(relationshipTypeId) : '',
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
    initialDirection,
    resolvedDefaultFromId,
    resolvedDefaultToId,
  ])

  useEffect(() => {
    if (isEditMode) return
    const desiredDirection = defaultPerspective === 'target' ? 'reverse' : 'forward'
    setDirection((prev) => {
      if (prev === desiredDirection) return prev
      return desiredDirection
    })
  }, [defaultPerspective, isEditMode])

  useEffect(() => {
    if (isEditMode) return
    if (!lockedField) return

    const fallbackId = resolvedCurrentEntityId || ''
    const lockedId =
      lockedField === 'from'
        ? resolvedDefaultFromId || fallbackId
        : resolvedDefaultToId || fallbackId

    if (!lockedId) return

    setValues((prev) => {
      const fieldKey = lockedField === 'from' ? 'fromEntityId' : 'toEntityId'
      if (prev[fieldKey] === lockedId) return prev

      const updates = { ...prev, [fieldKey]: lockedId }

      if (lockedField === 'from' && lockToEntity && prev.toEntityId === lockedId) {
        updates.toEntityId = ''
      }

      if (lockedField === 'to' && lockFromEntity && prev.fromEntityId === lockedId) {
        updates.fromEntityId = ''
      }

      return updates
    })
  }, [
    isEditMode,
    lockedField,
    lockFromEntity,
    lockToEntity,
    resolvedDefaultFromId,
    resolvedDefaultToId,
    resolvedCurrentEntityId,
  ])

  const handleValueChange = (field) => (event) => {
    const { value } = event.target
    setValues((prev) => {
      if (field !== 'relationshipTypeId' || isEditMode) {
        return { ...prev, [field]: value }
      }

      const updates = { ...prev, relationshipTypeId: value }

      if (lockedField === 'from') {
        updates.toEntityId = ''
      } else if (lockedField === 'to') {
        updates.fromEntityId = ''
      }

      return updates
    })
    if (field === 'relationshipTypeId') {
      setCreatingRole(null)
    }
  }

  const upsertEntityFromSelect = useCallback(
    (entity) => {
      if (!entity) return null
      const normalised = normaliseEntityRecord(entity)
      if (!normalised || normalised.id === undefined || normalised.id === null) {
        return null
      }

      const stringId = String(normalised.id)
      const record = { ...normalised, id: stringId }
      setEntities((prev) => {
        const existingIndex = prev.findIndex((entry) => String(entry.id) === stringId)
        if (existingIndex >= 0) {
          const clone = [...prev]
          clone[existingIndex] = { ...clone[existingIndex], ...record }
          return clone
        }
        return [record, ...prev]
      })

      return record
    },
    [setEntities],
  )

  const handleFromEntityChange = useCallback(
    (nextValue) => {
      setCreatingRole((prev) => (prev === 'from' ? null : prev))
      if (nextValue && typeof nextValue === 'object') {
        const record = upsertEntityFromSelect(nextValue)
        const nextId = record ? String(record.id) : ''
        setValues((prev) => ({ ...prev, fromEntityId: nextId }))
        return
      }

      const stringValue = normaliseId(nextValue)
      setValues((prev) => ({ ...prev, fromEntityId: stringValue }))
    },
    [upsertEntityFromSelect],
  )

  const handleToEntityChange = useCallback(
    (nextValue) => {
      setCreatingRole((prev) => (prev === 'to' ? null : prev))
      if (nextValue && typeof nextValue === 'object') {
        const record = upsertEntityFromSelect(nextValue)
        const nextId = record ? String(record.id) : ''
        setValues((prev) => ({ ...prev, toEntityId: nextId }))
        return
      }

      const stringValue = normaliseId(nextValue)
      setValues((prev) => ({ ...prev, toEntityId: stringValue }))
    },
    [upsertEntityFromSelect],
  )

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
      const record = upsertEntityFromSelect(entity)
      if (!record) return

      const nextId = String(record.id)

      if (role === 'from') {
        setValues((prev) => ({ ...prev, fromEntityId: nextId }))
      } else if (role === 'to') {
        setValues((prev) => ({ ...prev, toEntityId: nextId }))
      }

      triggerHighlight(role, nextId)
      setCreatingRole(null)

      const roleLabel = role === 'from' ? fromRoleLabel : toRoleLabel
      const capitalisedLabel = roleLabel ? `${roleLabel[0].toUpperCase()}${roleLabel.slice(1)}` : ''
      const successMessage = capitalisedLabel
        ? `New ${capitalisedLabel} entity added and selected.`
        : 'New entity added and selected.'
      onToast?.(successMessage, 'success')
    },
    [triggerHighlight, fromRoleLabel, toRoleLabel, onToast, upsertEntityFromSelect],
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
    const payloadDirection = direction === 'reverse' ? 'reverse' : 'forward'
    contextPayload.__direction = payloadDirection

    let payloadFromId = fromEntityId
    let payloadToId = toEntityId

    const shouldSwapPayload =
      payloadDirection === 'reverse' &&
      (!resolvedCurrentEntityId || values.fromEntityId === resolvedCurrentEntityId)

    if (shouldSwapPayload) {
      payloadFromId = toEntityId
      payloadToId = fromEntityId
    }

    const payload = {
      world_id: worldId,
      from_entity_id: payloadFromId,
      to_entity_id: payloadToId,
      relationship_type_id: relationshipTypeId,
      bidirectional: true,
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
    Boolean(typeFilterContext?.typeId) && availableRelationshipTypes.length === 0

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
      submitDisabled: saving || isBusy || isPerspectiveInvalid,
      cancelDisabled: saving,
    })
  }, [onStateChange, isEditMode, saving, isBusy, isPerspectiveInvalid])

  return (
    <form
      id={formId}
      className="entity-form relationship-form"
      onSubmit={handleSubmit}
    >
      {!isGlobalMode && (
        <PerspectiveToggle
          value={perspective}
          onChange={handlePerspectiveChange}
          disabled={saving || isBusy}
        />
      )}

      {perspectiveWarning && (
        <div className="alert warning" role="alert">
          {perspectiveWarning}
        </div>
      )}

      {autoCorrectionMessage && (
        <div className="alert warning" role="status">
          {autoCorrectionMessage}
        </div>
      )}

      <div className="form-two-column">
        <div
          className={`form-group${
            highlightedEntities.from && highlightedEntities.from === values.fromEntityId
              ? ' entity-select-highlight'
              : ''
          }`}
        >
          <label htmlFor="relationship-from-entity">From Entity *</label>
          <EntitySelect
            key={`from-${values.relationshipTypeId}-${allowedFromTypeIds.join(',')}`}
            id="relationship-from-entity"
            worldId={worldId}
            value={values.fromEntityId}
            onChange={handleFromEntityChange}
            allowedTypeIds={allowedFromTypeIds}
            onEntityResolved={upsertEntityFromSelect}
            initialEntities={filteredFromEntities}
            disabled={
              saving ||
              isBusy ||
              lockedField === 'from'
            }
            required
            autoFocus={editableField === 'from'}
            placeholder="Select entity..."
          />
          {lockedField === 'from' && lockedFieldHint && (
            <p className="field-hint">{lockedFieldHint}</p>
          )}
          {showEntityHelperHints && effectiveFromLabel && (
            <p className="field-hint">Displayed label: {effectiveFromLabel}</p>
          )}
          {showEntityHelperHints && activeRelationshipType && fromTypeSummary && (
            <p className="field-hint">{fromAllowedLabel}: {fromTypeSummary}</p>
          )}
          {lockedField !== 'from' && (
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
          {lockedField !== 'from' && allowedFromTypeIds.length === 0 && (
            <p className="inline-create-hint disabled">
              Inline creation isn’t available for this relationship.
            </p>
          )}
          {activeRelationshipType && allowedFromTypeIds.length > 0 &&
            filteredFromEntities.length === 0 && (
              <p className="field-hint">
                No entities match the allowed {fromRoleLabel} types yet. Use “+ Create new” to add one
                without leaving this page.
              </p>
            )}
          {lockedField !== 'from' && creatingRole === 'from' && (
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
            disabled={
              saving ||
              isBusy ||
              !availableRelationshipTypes.length ||
              (isGlobalMode && !values.fromEntityId && !values.toEntityId)
            }
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
          <EntitySelect
            key={`to-${values.relationshipTypeId}-${allowedToTypeIds.join(',')}`}
            id="relationship-to-entity"
            worldId={worldId}
            value={values.toEntityId}
            onChange={handleToEntityChange}
            allowedTypeIds={allowedToTypeIds}
            onEntityResolved={upsertEntityFromSelect}
            initialEntities={filteredToEntities}
            disabled={
              saving ||
              isBusy ||
              lockedField === 'to'
            }
            required
            autoFocus={editableField === 'to'}
            placeholder="Select entity..."
          />
          {lockedField === 'to' && lockedFieldHint && (
            <p className="field-hint">{lockedFieldHint}</p>
          )}
          {showEntityHelperHints && effectiveToLabel && (
            <p className="field-hint">Displayed label: {effectiveToLabel}</p>
          )}
          {showEntityHelperHints && activeRelationshipType && toTypeSummary && (
            <p className="field-hint">{toAllowedLabel}: {toTypeSummary}</p>
          )}
          {lockedField !== 'to' && (
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
          )}
          {lockedField !== 'to' && allowedToTypeIds.length === 0 && (
            <p className="inline-create-hint disabled">
              Inline creation isn’t available for this relationship.
            </p>
          )}
          {activeRelationshipType && allowedToTypeIds.length > 0 && filteredToEntities.length === 0 && (
            <p className="field-hint">
              No entities match the allowed {toRoleLabel} types yet. Use “+ Create new” to add one without
              losing your place.
            </p>
          )}
          {lockedField !== 'to' && creatingRole === 'to' && (
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
          <button
            type="submit"
            className="btn submit"
            disabled={saving || isBusy || isPerspectiveInvalid}
          >
            {saving ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Relationship'}
          </button>
        </div>
      )}
    </form>
  )
}
