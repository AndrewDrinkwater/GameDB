import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ChevronDown,
  ChevronRight,
  Filter,
  GripVertical,
  Pencil,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react'
import { deleteEntity, getUnassignedEntities, getWorldEntities } from '../../api/entities.js'
import {
  getEntityTypeListColumns,
  updateEntityTypeListColumns,
} from '../../api/entityTypes.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useCampaignContext } from '../../context/CampaignContext.jsx'
import DrawerPanel from '../../components/DrawerPanel.jsx'
import EntityForm from './EntityForm.jsx'
import SearchBar from '../../components/SearchBar.jsx'
import ConditionBuilderModal from '../../components/ConditionBuilderModal.jsx'
import EntityInfoPreview from '../../components/entities/EntityInfoPreview.jsx'
import useDataExplorer from '../../hooks/useDataExplorer.js'
import useIsMobile from '../../hooks/useIsMobile.js'

const VISIBILITY_BADGES = {
  visible: 'badge-visible',
  partial: 'badge-partial',
  hidden: 'badge-hidden',
}

const MANAGER_ROLES = new Set(['system_admin'])
const FILTER_PARAM = 'entityType'

const DEFAULT_COLUMN_KEYS = ['name', 'type', 'visibility', 'createdAt']
const MOBILE_COLUMN_KEYS = ['name', 'description']

const DEFAULT_CORE_COLUMN_OPTIONS = [
  { key: 'name', label: 'Name', type: 'core' },
  { key: 'type', label: 'Type', type: 'core' },
  { key: 'visibility', label: 'Visibility', type: 'core' },
  { key: 'createdAt', label: 'Created', type: 'core' },
  { key: 'description', label: 'Description', type: 'core' },
]

const COLUMN_SCOPE_USER = 'user'
const COLUMN_SCOPE_SYSTEM = 'system'

const createDrawerFooterState = (mode = 'create') => ({
  mode,
  submitLabel: mode === 'edit' ? 'Save Changes' : 'Create Entity',
  submitDisabled: false,
  cancelDisabled: false,
})

const listsMatch = (a = [], b = []) => {
  if (a.length !== b.length) return false
  return a.every((value, index) => value === b[index])
}

const sanitiseColumnSelection = (columns, fallbackList, allowedKeys) => {
  const allowed = new Set(allowedKeys)
  const cleaned = []

  if (Array.isArray(columns)) {
    columns.forEach((value) => {
      if (typeof value !== 'string') return
      const trimmed = value.trim()
      if (!trimmed || !allowed.has(trimmed)) return
      if (!cleaned.includes(trimmed)) {
        cleaned.push(trimmed)
      }
    })
  }

  if (cleaned.length > 0) {
    return cleaned
  }

  const fallback = Array.isArray(fallbackList)
    ? fallbackList.filter((value) => typeof value === 'string' && allowed.has(value))
    : []

  if (fallback.length > 0) {
    return [...fallback]
  }

  if (allowed.size > 0) {
    return [allowed.values().next().value]
  }

  return []
}

const formatMetadataValue = (value) => {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '—'
  if (value instanceof Date) return value.toLocaleDateString()
  if (Array.isArray(value)) {
    if (value.length === 0) return '—'
    return value
      .filter((item) => item !== null && item !== undefined && String(item).trim() !== '')
      .map((item) => (typeof item === 'string' ? item.trim() : String(item)))
      .join(', ')
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch (err) {
      console.warn('⚠️ Failed to stringify metadata value', err)
      return '—'
    }
  }
  const text = String(value).trim()
  return text || '—'
}

export default function EntityList() {
  const { user, token, sessionReady } = useAuth()
  const { selectedCampaign } = useCampaignContext()
  const [searchParams, setSearchParams] = useSearchParams()
  const isMobile = useIsMobile()

  const [entities, setEntities] = useState([])
  const [loadingEntities, setLoadingEntities] = useState(false)
  const [entitiesError, setEntitiesError] = useState('')

  const [panelOpen, setPanelOpen] = useState(false)
  const [editingEntityId, setEditingEntityId] = useState(null)
  const [activeEntityName, setActiveEntityName] = useState('')
  const [deletingId, setDeletingId] = useState('')
  const [toast, setToast] = useState(null)
  const [columnOptions, setColumnOptions] = useState(null)
  const [columnsLoading, setColumnsLoading] = useState(false)
  const [columnsError, setColumnsError] = useState('')
  const [userColumnPreference, setUserColumnPreference] = useState(null)
  const [systemColumnDefault, setSystemColumnDefault] = useState(null)
  const [selectedColumnKeys, setSelectedColumnKeys] = useState(() => [
    ...DEFAULT_COLUMN_KEYS,
  ])
  const [draftColumnKeys, setDraftColumnKeys] = useState(() => [...DEFAULT_COLUMN_KEYS])
  const [columnMenuOpen, setColumnMenuOpen] = useState(false)
  const [columnSelectionError, setColumnSelectionError] = useState('')
  const [columnsSavingScope, setColumnsSavingScope] = useState('')
  const [draggingColumnKey, setDraggingColumnKey] = useState('')
  const [dropTargetKey, setDropTargetKey] = useState('')
  const [entityFormUiState, setEntityFormUiState] = useState(() =>
    createDrawerFooterState('create'),
  )
  const [filterModalOpen, setFilterModalOpen] = useState(false)
  const [groupMenuState, setGroupMenuState] = useState({
    open: false,
    columnKey: '',
    columnLabel: '',
    x: 0,
    y: 0,
  })
  const [viewingUnassigned, setViewingUnassigned] = useState(false)

  const currentSearch = searchParams.toString()

  const worldId = selectedCampaign?.world?.id ?? ''
  const selectedFilter = searchParams.get(FILTER_PARAM) ?? ''
  const filterActive = Boolean(selectedFilter)

  const entityFormIdRef = useRef(`entity-form-${Math.random().toString(36).slice(2)}`)
  const previousWorldIdRef = useRef(worldId)

  const showToast = useCallback((message, tone = 'info') => {
    setToast({ message, tone })
  }, [])

  useEffect(() => {
    if (!isMobile || !columnMenuOpen) return
    setColumnMenuOpen(false)
  }, [isMobile, columnMenuOpen])

  useEffect(() => {
    if (!groupMenuState.open) return
    const close = () =>
      setGroupMenuState({ open: false, columnKey: '', columnLabel: '', x: 0, y: 0 })
    window.addEventListener('click', close)
    window.addEventListener('contextmenu', close)
    return () => {
      window.removeEventListener('click', close)
      window.removeEventListener('contextmenu', close)
    }
  }, [groupMenuState.open])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(timer)
  }, [toast])

  const formatDate = useCallback((value) => {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '—'
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }, [])

  const membershipRole = useMemo(() => {
    if (!selectedCampaign || !user) return ''
    const member = selectedCampaign.members?.find((entry) => entry.user_id === user.id)
    return member?.role || ''
  }, [selectedCampaign, user])

  const isWorldOwner = useMemo(() => {
    if (!selectedCampaign || !user) return false
    const ownerId = selectedCampaign.world?.created_by
    return ownerId ? ownerId === user.id : false
  }, [selectedCampaign, user])

  const canManage = useMemo(() => {
    if (!user) return false
    if (MANAGER_ROLES.has(user.role)) return true
    if (!selectedCampaign) return false
    if (membershipRole === 'dm') return true
    if (isWorldOwner) return true
    return false
  }, [selectedCampaign, user, membershipRole, isWorldOwner])

  const isSystemAdmin = user?.role === 'system_admin'

  const loadEntities = useCallback(
    async (targetWorldId, options = {}) => {
      if (!token) {
        setEntities([])
        return []
      }

      const { useUnassigned = false } = options

      if (useUnassigned) {
        if (!isSystemAdmin) {
          setEntities([])
          setEntitiesError('Only system administrators can view unassigned entities')
          return []
        }

        setLoadingEntities(true)
        setEntitiesError('')

        try {
          const response = await getUnassignedEntities()
          const list = Array.isArray(response)
            ? response
            : Array.isArray(response?.data)
              ? response.data
              : []
          setEntities(list)
          return list
        } catch (err) {
          console.error('❌ Failed to load unassigned entities', err)
          setEntitiesError(err.message || 'Failed to load unassigned entities')
          setEntities([])
          return []
        } finally {
          setLoadingEntities(false)
        }
      }

      const worldToFetch = targetWorldId ?? worldId
      if (!worldToFetch) {
        setEntities([])
        return []
      }

      setLoadingEntities(true)
      setEntitiesError('')

      try {
        const response = await getWorldEntities(worldToFetch)
        const list = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
            ? response.data
            : []
        setEntities(list)
        return list
      } catch (err) {
        console.error('❌ Failed to load entities', err)
        setEntitiesError(err.message || 'Failed to load entities')
        setEntities([])
        return []
      } finally {
        setLoadingEntities(false)
      }
    },
    [token, worldId, isSystemAdmin],
  )

  useEffect(() => {
    if (!token) {
      setEntities([])
      return
    }

    if (viewingUnassigned) {
      loadEntities(null, { useUnassigned: true })
      return
    }

    if (!worldId) {
      setEntities([])
      return
    }

    loadEntities(worldId)
  }, [worldId, token, viewingUnassigned, loadEntities])

  useEffect(() => {
    if (viewingUnassigned) {
      return
    }

    if (previousWorldIdRef.current !== worldId) {
      if (panelOpen) {
        setPanelOpen(false)
        setEditingEntityId(null)
      }
      setActiveEntityName('')
      setEntityFormUiState(createDrawerFooterState('create'))
      setEntitiesError('')
      setToast(null)
      previousWorldIdRef.current = worldId
    }
  }, [worldId, panelOpen, viewingUnassigned])

  useEffect(() => {
    if (!isSystemAdmin && viewingUnassigned) {
      setViewingUnassigned(false)
    }
  }, [isSystemAdmin, viewingUnassigned])

  useEffect(() => {
    if (!viewingUnassigned) return
    if (panelOpen) {
      setPanelOpen(false)
      setEditingEntityId(null)
      setActiveEntityName('')
      setEntityFormUiState(createDrawerFooterState('create'))
    }
  }, [viewingUnassigned, panelOpen])

  useEffect(() => {
    setColumnMenuOpen(false)
    setColumnSelectionError('')

    if (!selectedFilter || !token || !sessionReady) {
      setColumnOptions(null)
      setColumnsError('')
      setUserColumnPreference(null)
      setSystemColumnDefault(null)
      setSelectedColumnKeys([...DEFAULT_COLUMN_KEYS])
      setDraftColumnKeys([...DEFAULT_COLUMN_KEYS])
      setColumnsLoading(false)
      return
    }

    let isCancelled = false

    const loadColumnOptions = async () => {
      setColumnsLoading(true)
      setColumnsError('')
      try {
        const response = await getEntityTypeListColumns(selectedFilter)
        if (isCancelled) return

        const payload = response?.data ?? response ?? {}
        const data = payload.data ?? payload

        const coreListSource = Array.isArray(data.coreColumns) && data.coreColumns.length
          ? data.coreColumns
          : DEFAULT_CORE_COLUMN_OPTIONS

        const defaultCoreMap = new Map(
          DEFAULT_CORE_COLUMN_OPTIONS.map((column) => [column.key, column]),
        )

        const resolvedCore = coreListSource.map((column) => {
          const fallback = defaultCoreMap.get(column.key) ?? {}
          return {
            ...fallback,
            ...column,
            type: 'core',
            label: column.label || fallback.label || column.key,
          }
        })

        const missingCore = DEFAULT_CORE_COLUMN_OPTIONS.filter(
          (column) => !resolvedCore.some((entry) => entry.key === column.key),
        )

        const coreColumns = [...resolvedCore, ...missingCore]

        const metadataSource = Array.isArray(data.metadataColumns) ? data.metadataColumns : []
        const metadataColumns = metadataSource
          .filter((column) => typeof column?.key === 'string')
          .map((column) => ({
            key: column.key,
            name: column.name || column.key.replace(/^metadata\./, ''),
            label: column.label || column.name || column.key.replace(/^metadata\./, ''),
            dataType: column.dataType || column.data_type || '',
            required: Boolean(column.required),
          }))
          .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }))

        const allowedKeys = new Set([
          ...coreColumns.map((column) => column.key),
          ...metadataColumns.map((column) => column.key),
        ])
        DEFAULT_COLUMN_KEYS.forEach((key) => allowedKeys.add(key))

        const fallbackColumns = sanitiseColumnSelection(
          DEFAULT_COLUMN_KEYS,
          DEFAULT_COLUMN_KEYS,
          allowedKeys,
        )

        const systemSource = data.systemDefault?.columns
        const systemColumns = Array.isArray(systemSource) && systemSource.length
          ? sanitiseColumnSelection(systemSource, fallbackColumns, allowedKeys)
          : [...fallbackColumns]

        const userSource = data.userPreference?.columns
        const hasUserPreference = Array.isArray(userSource) && userSource.length > 0
        const userColumns = hasUserPreference
          ? sanitiseColumnSelection(userSource, systemColumns, allowedKeys)
          : []

        const effectiveSelection =
          hasUserPreference && userColumns.length ? userColumns : systemColumns

        setColumnOptions({ coreColumns, metadataColumns })
        setSystemColumnDefault(
          systemColumns.length
            ? {
                columns: [...systemColumns],
                updatedAt: data.systemDefault?.updatedAt ?? null,
              }
            : null,
        )
        setUserColumnPreference(
          hasUserPreference && userColumns.length
            ? {
                columns: [...userColumns],
                updatedAt: data.userPreference?.updatedAt ?? null,
              }
            : null,
        )
        setSelectedColumnKeys([...effectiveSelection])
        setDraftColumnKeys([...effectiveSelection])
      } catch (err) {
        if (isCancelled) return
        console.error('❌ Failed to load column configuration', err)
        setColumnsError(err.message || 'Failed to load column configuration')
        setColumnOptions(null)
        setUserColumnPreference(null)
        setSystemColumnDefault(null)
        setSelectedColumnKeys([...DEFAULT_COLUMN_KEYS])
        setDraftColumnKeys([...DEFAULT_COLUMN_KEYS])
      } finally {
        if (!isCancelled) {
          setColumnsLoading(false)
        }
      }
    }

    loadColumnOptions()

    return () => {
      isCancelled = true
    }
  }, [selectedFilter, token, sessionReady])

  const filteredEntities = useMemo(() => {
    if (!selectedFilter) return entities
    return entities.filter((entity) => {
      const typeId =
        entity.entity_type_id || entity.entityType?.id || entity.entity_type?.id || ''
      return typeId === selectedFilter
    })
  }, [entities, selectedFilter])

  const activeTypeName = useMemo(() => {
    if (!selectedFilter) return ''
    const match = entities.find((entity) => {
      const typeId =
        entity.entity_type_id || entity.entityType?.id || entity.entity_type?.id || ''
      return typeId === selectedFilter
    })
    return match?.entityType?.name || match?.entity_type?.name || ''
  }, [entities, selectedFilter])

  const columnOptionList = useMemo(() => {
    const combined = []
    const seen = new Set()

    const appendColumn = (column, fallbackType) => {
      if (!column || typeof column !== 'object') return
      const key = typeof column.key === 'string' ? column.key.trim() : ''
      if (!key || seen.has(key)) return
      const labelCandidate =
        column.label || column.name || (typeof column.title === 'string' ? column.title : '')
      const label = typeof labelCandidate === 'string' && labelCandidate.trim()
        ? labelCandidate.trim()
        : key
      combined.push({
        ...column,
        key,
        label,
        type: column.type || fallbackType,
      })
      seen.add(key)
    }

    const coreSource = columnOptions?.coreColumns ?? DEFAULT_CORE_COLUMN_OPTIONS
    coreSource.forEach((column) => appendColumn(column, 'core'))

    const metadataSource = columnOptions?.metadataColumns ?? []
    metadataSource.forEach((column) => appendColumn(column, 'metadata'))

    return combined
  }, [columnOptions])

  const availableColumnMap = useMemo(() => {
    const map = new Map()
    columnOptionList.forEach((column) => {
      map.set(column.key, {
        ...column,
        type: column.type === 'metadata' ? 'metadata' : 'core',
      })
    })
    return map
  }, [columnOptionList])

  const allowedColumnKeys = useMemo(
    () => Array.from(availableColumnMap.keys()),
    [availableColumnMap],
  )

  const fallbackColumns = useMemo(() => {
    const base = DEFAULT_COLUMN_KEYS.filter((key) => availableColumnMap.has(key))
    if (base.length > 0) return base
    if (allowedColumnKeys.length > 0) return [allowedColumnKeys[0]]
    return [...DEFAULT_COLUMN_KEYS]
  }, [allowedColumnKeys, availableColumnMap])

  const effectiveColumnKeys = useMemo(() => {
    if (isMobile) {
      const keys = []
      if (availableColumnMap.has('name')) keys.push('name')
      if (availableColumnMap.has('description')) keys.push('description')
      if (keys.length > 0) return keys
      return fallbackColumns.filter((key) => availableColumnMap.has(key))
    }
    if (selectedFilter) return selectedColumnKeys
    return DEFAULT_COLUMN_KEYS
  }, [
    isMobile,
    availableColumnMap,
    fallbackColumns,
    selectedFilter,
    selectedColumnKeys,
  ])

  useEffect(() => {
    if (!selectedFilter) return
    setSelectedColumnKeys((prev) => {
      const filtered = prev.filter((key) => availableColumnMap.has(key))
      if (filtered.length > 0) return filtered
      return fallbackColumns
    })
  }, [selectedFilter, availableColumnMap, fallbackColumns])

  useEffect(() => {
    setDraftColumnKeys([...selectedColumnKeys])
  }, [selectedColumnKeys])

  const visibleColumnDefs = useMemo(() => {
    const resolved = effectiveColumnKeys
      .map((key) => availableColumnMap.get(key))
      .filter(Boolean)
    if (resolved.length > 0) return resolved
    return fallbackColumns.map((key) => availableColumnMap.get(key)).filter(Boolean)
  }, [effectiveColumnKeys, availableColumnMap, fallbackColumns])

  const systemBaselineColumns = systemColumnDefault?.columns ?? fallbackColumns
  const userBaselineColumns = userColumnPreference?.columns ?? systemBaselineColumns

  const isUserDirty =
    Boolean(selectedFilter) && !listsMatch(draftColumnKeys, userBaselineColumns)
  const isSystemDirty =
    Boolean(selectedFilter) && !listsMatch(draftColumnKeys, systemBaselineColumns)

  const isSavingUserColumns = columnsSavingScope === COLUMN_SCOPE_USER
  const isSavingSystemColumns = columnsSavingScope === COLUMN_SCOPE_SYSTEM
  const draftMatchesSystem = listsMatch(draftColumnKeys, systemBaselineColumns)

  const handleResetToBaseline = () => {
    setDraftColumnKeys([...systemBaselineColumns])
    setColumnSelectionError('')
    setDraggingColumnKey('')
    setDropTargetKey('')
  }

  const handleToggleColumn = (key) => {
    if (!selectedFilter) return
    setDraftColumnKeys((prev) => {
      if (prev.includes(key)) {
        if (prev.length === 1) {
          setColumnSelectionError('You must keep at least one column selected.')
          return prev
        }
        setColumnSelectionError('')
        if (draggingColumnKey === key) {
          setDraggingColumnKey('')
          setDropTargetKey('')
        }
        return prev.filter((value) => value !== key)
      }
      if (!availableColumnMap.has(key)) return prev
      setColumnSelectionError('')
      return [...prev, key]
    })
  }

  const handleColumnDragStart = (key, event) => {
    if (!selectedFilter) return
    if (!draftColumnKeys.includes(key)) return
    setDraggingColumnKey(key)
    setDropTargetKey('')
    if (event?.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', key)
    }
  }

  const handleColumnDragOver = (key, event) => {
    if (!draggingColumnKey || draggingColumnKey === key) return
    if (!draftColumnKeys.includes(key)) return
    if (event) {
      event.preventDefault()
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move'
      }
    }
    setDropTargetKey(key)
  }

  const handleColumnDrop = (targetKey) => {
    if (!selectedFilter) return
    setDraftColumnKeys((prev) => {
      if (!draggingColumnKey || draggingColumnKey === targetKey) return prev
      const sourceIndex = prev.indexOf(draggingColumnKey)
      const targetIndex = prev.indexOf(targetKey)
      if (sourceIndex === -1 || targetIndex === -1) return prev
      const next = [...prev]
      const [movingKey] = next.splice(sourceIndex, 1)
      const insertIndex = sourceIndex < targetIndex ? Math.max(targetIndex - 1, 0) : targetIndex
      next.splice(insertIndex, 0, movingKey)
      return next
    })
    setDropTargetKey('')
    setDraggingColumnKey('')
  }

  const handleColumnDropAtEnd = () => {
    if (!selectedFilter) return
    setDraftColumnKeys((prev) => {
      if (!draggingColumnKey) return prev
      if (!prev.includes(draggingColumnKey)) return prev
      const next = prev.filter((value) => value !== draggingColumnKey)
      next.push(draggingColumnKey)
      return next
    })
    setDropTargetKey('')
    setDraggingColumnKey('')
  }

  const handleColumnDragEnd = () => {
    setDropTargetKey('')
    setDraggingColumnKey('')
  }

  const handleOpenColumnMenu = () => {
    if (!selectedFilter) return
    setColumnSelectionError('')
    setColumnMenuOpen((prev) => {
      const next = !prev
      if (!prev && next) {
        setDraftColumnKeys([...selectedColumnKeys])
        setDraggingColumnKey('')
        setDropTargetKey('')
      }
      if (prev && !next) {
        setDraggingColumnKey('')
        setDropTargetKey('')
      }
      return next
    })
  }

  const handleCloseColumnMenu = () => {
    setColumnMenuOpen(false)
    setDropTargetKey('')
    setDraggingColumnKey('')
  }

  const handleSaveColumns = async (scope) => {
    if (!selectedFilter) return
    if (draftColumnKeys.length === 0) {
      setColumnSelectionError('Please select at least one column.')
      return
    }

    setColumnsSavingScope(scope)
    setColumnSelectionError('')

    try {
      await updateEntityTypeListColumns(selectedFilter, {
        scope,
        columns: draftColumnKeys,
      })

      if (scope === COLUMN_SCOPE_USER) {
        setUserColumnPreference({
          columns: [...draftColumnKeys],
          updatedAt: new Date().toISOString(),
        })
        setSelectedColumnKeys([...draftColumnKeys])
        handleCloseColumnMenu()
        showToast('Column preference saved', 'success')
      } else {
        setSystemColumnDefault({
          columns: [...draftColumnKeys],
          updatedAt: new Date().toISOString(),
        })
        setSelectedColumnKeys([...draftColumnKeys])
        showToast('System default updated', 'success')
      }
    } catch (err) {
      console.error('❌ Failed to save column selection', err)
      setColumnSelectionError(err.message || 'Failed to save column settings')
    } finally {
      setColumnsSavingScope('')
    }
  }

  const getEntityTypeLabel = useCallback(
    (entity) => entity?.entityType?.name || entity?.entity_type?.name || '—',
    [],
  )

  const resolveEntityValue = useCallback(
    (entity, key) => {
      if (!entity) return ''
      switch (key) {
        case 'name':
          return entity.name || ''
        case 'type':
          return getEntityTypeLabel(entity)
        case 'visibility':
          return entity.visibility || 'visible'
        case 'createdAt':
          return entity.createdAt || entity.created_at || ''
        case 'description':
          return entity.description || ''
        default: {
          if (key.startsWith('metadata.')) {
            const metadata =
              entity.metadata && typeof entity.metadata === 'object' ? entity.metadata : {}
            const metaKey = key.replace(/^metadata\./, '')
            return metadata?.[metaKey]
          }
          return entity[key]
        }
      }
    },
    [getEntityTypeLabel],
  )

  const explorerColumns = useMemo(() => {
    const entries = []
    availableColumnMap.forEach((column) => {
      const metadataType =
        column.type === 'metadata'
          ? column.dataType || column.data_type || 'string'
          : column.dataType
      const resolvedType = metadataType || (column.key === 'createdAt' ? 'date' : 'string')
      entries.push({
        key: column.key,
        label: column.label || column.name || column.key,
        dataType: resolvedType,
        accessor: (entity) => resolveEntityValue(entity, column.key),
      })
    })
    return entries
  }, [availableColumnMap, resolveEntityValue])

  const explorerColumnMap = useMemo(
    () => new Map(explorerColumns.map((column) => [column.key, column])),
    [explorerColumns],
  )

  const dataExplorer = useDataExplorer(filteredEntities, { columns: explorerColumns })

  const formatGroupLabel = useCallback(
    (value) => {
      const column = dataExplorer.groupBy
        ? availableColumnMap.get(dataExplorer.groupBy)
        : null
      if (!column) {
        return formatMetadataValue(value)
      }

      if (column.key === 'visibility') {
        const text = typeof value === 'string' ? value : ''
        if (!text) return 'Hidden'
        return text.charAt(0).toUpperCase() + text.slice(1)
      }

      if (column.key === 'createdAt') {
        return formatDate(value)
      }

      if (column.key === 'type') {
        return value || 'Unassigned'
      }

      if (column.key.startsWith('metadata.')) {
        return formatMetadataValue(value)
      }

      if (column.key === 'name' || column.key === 'description') {
        return value ? String(value) : '—'
      }

      return value ? String(value) : 'Unassigned'
    },
    [availableColumnMap, dataExplorer.groupBy, formatDate],
  )

  const filterFields = useMemo(
    () =>
      explorerColumns.map((column) => ({
        key: column.key,
        label: explorerColumnMap.get(column.key)?.label || column.label || column.key,
        dataType: column.dataType,
      })),
    [explorerColumns, explorerColumnMap],
  )

  const handleHeaderClick = (columnKey) => {
    if (!columnKey) return
    dataExplorer.toggleSort(columnKey)
  }

  const handleHeaderContextMenu = (event, column) => {
    event.preventDefault()
    setGroupMenuState({
      open: true,
      columnKey: column.key,
      columnLabel: column.label || column.name || column.key,
      x: event.clientX,
      y: event.clientY,
    })
  }

  const handleGroupByColumn = (columnKey) => {
    dataExplorer.setGroupBy(columnKey)
    setGroupMenuState({ open: false, columnKey: '', columnLabel: '', x: 0, y: 0 })
  }

  const renderEntityColumn = (column, entity) => {
    const metadata =
      entity.metadata && typeof entity.metadata === 'object' ? entity.metadata : {}

    switch (column.key) {
      case 'name':
        return (
          <span className="entity-link-with-preview">
            <Link
              to={`/entities/${entity.id}`}
              state={{
                fromEntities: {
                  search: currentSearch,
                },
              }}
              className="entity-name-link"
            >
              {entity.name}
            </Link>
            {entity.id ? (
              <EntityInfoPreview entityId={entity.id} entityName={entity.name || 'entity'} />
            ) : null}
          </span>
        )
      case 'type':
        return getEntityTypeLabel(entity)
      case 'visibility': {
        const visibility = entity.visibility || 'visible'
        const badgeClass = VISIBILITY_BADGES[visibility] || 'badge-hidden'
        return (
          <span className={`visibility-badge ${badgeClass}`}>
            {visibility.charAt(0).toUpperCase() + visibility.slice(1)}
          </span>
        )
      }
      case 'createdAt':
        return formatDate(entity.createdAt || entity.created_at)
      case 'description':
        return entity.description ? entity.description : '—'
      default: {
        if (column.key.startsWith('metadata.')) {
          const key = column.key.replace(/^metadata\./, '')
          return formatMetadataValue(metadata?.[key])
        }
        return '—'
      }
    }
  }

  const closePanel = () => {
    setPanelOpen(false)
    setEditingEntityId(null)
    setActiveEntityName('')
    setEntityFormUiState(createDrawerFooterState('create'))
  }

  const handleFormSaved = async (mode) => {
    closePanel()
    if (viewingUnassigned) {
      await loadEntities(null, { useUnassigned: true })
    } else if (worldId) {
      await loadEntities(worldId)
    }
    showToast(mode === 'create' ? 'Entity created' : 'Entity updated', 'success')
  }

  const handleDelete = async (entity) => {
    if (!canManage || !entity?.id) return
    const confirmed = window.confirm(
      `Delete entity "${entity.name}"? This action cannot be undone.`,
    )
    if (!confirmed) return

    try {
      setDeletingId(entity.id)
      await deleteEntity(entity.id)
      showToast('Entity deleted', 'success')
      if (viewingUnassigned) {
        await loadEntities(null, { useUnassigned: true })
      } else if (worldId) {
        await loadEntities(worldId)
      }
    } catch (err) {
      console.error('❌ Failed to delete entity', err)
      showToast(err.message || 'Failed to delete entity', 'error')
    } finally {
      setDeletingId('')
    }
  }

  const handleRefresh = () => {
    if (viewingUnassigned) {
      loadEntities(null, { useUnassigned: true })
      return
    }
    if (!worldId) return
    loadEntities(worldId)
  }

  const openCreate = () => {
    if (!canManage || !worldId || viewingUnassigned) return
    setEditingEntityId(null)
    setActiveEntityName('')
    setEntityFormUiState(createDrawerFooterState('create'))
    setPanelOpen(true)
  }

  const openEdit = (entity) => {
    if (!canManage || !entity?.id) return
    const name = typeof entity.name === 'string' ? entity.name.trim() : ''
    setEditingEntityId(entity.id)
    setActiveEntityName(name)
    setEntityFormUiState(createDrawerFooterState('edit'))
    setPanelOpen(true)
  }

  const handleEntityFormStateChange = useCallback((nextState) => {
    if (!nextState) return
    setEntityFormUiState((prev) => ({
      ...prev,
      ...nextState,
    }))
  }, [])

  const editingEntityTitleName = useMemo(() => {
    if (!editingEntityId) return ''
    const match = entities.find((item) => item.id === editingEntityId)
    const resolvedName =
      (typeof match?.name === 'string' && match.name.trim()) ||
      (typeof activeEntityName === 'string' && activeEntityName.trim()) ||
      ''
    return resolvedName || 'Untitled entity'
  }, [entities, editingEntityId, activeEntityName])

  const entityDrawerTitle = editingEntityId
    ? `Edit Entity: ${editingEntityTitleName}`
    : 'Add Entity'

  const clearFilter = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete(FILTER_PARAM)
      return next
    })
  }, [setSearchParams])

  if (!sessionReady) return <p>Restoring session...</p>
  if (!token) return <p>Authenticating...</p>

  const hasEntities = filteredEntities.length > 0
  const hasResults = dataExplorer.groupBy
    ? dataExplorer.groups.some((group) => group.items.length > 0)
    : dataExplorer.data.length > 0
  const pageClassName = `entities-page${isMobile ? ' entities-page--mobile' : ''}`

  return (
    <section className={pageClassName}>
      <div className="entities-header">
        <div>
          <h1>Entities</h1>
          {viewingUnassigned ? (
            <p className="entities-subtitle">
              Showing entities without a world assignment.
            </p>
          ) : selectedCampaign ? (
            <p className="entities-subtitle">
              {selectedCampaign.name}
              {selectedCampaign.world?.name ? ` · ${selectedCampaign.world.name}` : ''}
            </p>
          ) : (
            <p className="entities-subtitle">
              Select a campaign from the header to choose a world context.
            </p>
          )}
          {/* Filter chip removed for streamlined type-specific lists */}
        </div>
        <div className="entities-controls">
          {isSystemAdmin && (
            <button
              type="button"
              className={`btn secondary compact${viewingUnassigned ? ' is-active' : ''}`}
              onClick={() => setViewingUnassigned((prev) => !prev)}
              aria-pressed={viewingUnassigned}
              title={
                viewingUnassigned
                  ? 'Show entities for the selected world'
                  : 'Show entities that do not have a world assigned'
              }
            >
              No World
            </button>
          )}
          <SearchBar
            value={dataExplorer.searchTerm}
            onChange={dataExplorer.setSearchTerm}
            placeholder="Search entities..."
            ariaLabel="Search entities"
          />
          <button
            type="button"
            className={`btn secondary compact${dataExplorer.filterActive ? ' is-active' : ''}`}
            onClick={() => setFilterModalOpen(true)}
          >
            <Filter size={16} /> Filters
          </button>
          {!isMobile && filterActive && (
            <div className="entities-column-menu-wrapper">
              <button
                type="button"
                className="btn secondary"
                aria-haspopup="dialog"
                onClick={handleOpenColumnMenu}
              >
                <SlidersHorizontal size={16} />
                <span className="btn-label">Columns</span>
              </button>
              {columnMenuOpen && (
                <div
                  className="entities-column-drawer-overlay"
                  role="presentation"
                  onClick={handleCloseColumnMenu}
                >
                  <div
                    className="entities-column-drawer"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="column-drawer-title"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="entities-column-drawer-header">
                      <div>
                        <h3 id="column-drawer-title">
                          Columns for {activeTypeName || 'selected type'}
                        </h3>
                        <p className="entities-column-info">
                          Choose which fields are visible in this list. Drag the handle to
                          reorder selected columns and save to keep your personal preference.
                        </p>
                      </div>
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={handleCloseColumnMenu}
                        title="Close column settings"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <div className="entities-column-drawer-body">
                      {columnsLoading ? (
                        <p className="entities-column-info">Loading columns…</p>
                      ) : columnsError ? (
                        <div className="alert error" role="alert">
                          {columnsError}
                        </div>
                      ) : (
                        <>
                          <p className="entities-column-hint">
                            Checked columns appear in the table. Drag the grip icon to adjust
                            their display order.
                          </p>
                          <ul className="entities-column-list">
                            {/* --- Selected (active) columns, in correct order --- */}
                            {draftColumnKeys.map((key) => {
                              const column = columnOptionList.find((c) => c.key === key)
                              if (!column) return null
                              const isDragging = draggingColumnKey === key
                              const badgeLabel = column.type === 'metadata' ? 'Metadata' : 'Core'

                              return (
                                <Fragment key={key}>
                                  {dropTargetKey === key && <div className="drop-indicator" />}
                                  <li
                                    className={`entities-column-item${isDragging ? ' is-dragging' : ''}`}
                                    draggable
                                    onDragStart={(e) => handleColumnDragStart(key, e)}
                                    onDragOver={(e) => handleColumnDragOver(key, e)}
                                    onDrop={() => handleColumnDrop(key)}
                                    onDragEnd={handleColumnDragEnd}
                                  >
                                    <div className="entities-column-item-main">
                                      <input
                                        type="checkbox"
                                        checked
                                        onChange={() => handleToggleColumn(key)}
                                      />
                                      <label className="entities-column-name">{column.label}</label>
                                      <span className="entities-column-type-badge">{badgeLabel}</span>
                                    </div>
                                    <button
                                      type="button"
                                      className="entities-column-handle"
                                      draggable
                                      onDragStart={(e) => handleColumnDragStart(key, e)}
                                    >
                                      <GripVertical size={18} />
                                    </button>
                                  </li>
                                </Fragment>
                              )
                            })}

                            {/* --- Drop indicator at end of list --- */}
                            {draggingColumnKey && dropTargetKey === '__end' && (
                              <div className="drop-indicator end" />
                            )}

                            {/* --- Inactive (unchecked) columns --- */}
                            {columnOptionList
                              .filter((col) => !draftColumnKeys.includes(col.key))
                              .map((column) => {
                                const badgeLabel = column.type === 'metadata' ? 'Metadata' : 'Core'
                                return (
                                  <li key={column.key} className="entities-column-item inactive">
                                    <div className="entities-column-item-main">
                                      <input
                                        type="checkbox"
                                        checked={false}
                                        onChange={() => handleToggleColumn(column.key)}
                                      />
                                      <label className="entities-column-name">{column.label}</label>
                                      <span className="entities-column-type-badge">{badgeLabel}</span>
                                    </div>
                                    <div className="entities-column-handle-placeholder" />
                                  </li>
                                )
                              })}
                          </ul>


                          {draggingColumnKey && (
                            <div
                              className={`entities-column-dropzone${
                                dropTargetKey === '__end' ? ' is-active' : ''
                              }`}
                              onDragOver={(event) => {
                                if (!draggingColumnKey) return
                                event.preventDefault()
                                if (event.dataTransfer) {
                                  event.dataTransfer.dropEffect = 'move'
                                }
                                setDropTargetKey('__end')
                              }}
                              onDragLeave={() => {
                                if (dropTargetKey === '__end') {
                                  setDropTargetKey('')
                                }
                              }}
                              onDrop={(event) => {
                                event.preventDefault()
                                handleColumnDropAtEnd()
                              }}
                            >
                              Drop here to move column to the end
                            </div>
                          )}
                          {columnOptionList.every((column) => column.type !== 'metadata') && (
                            <p className="entities-column-empty">
                              This entity type does not have metadata fields yet.
                            </p>
                          )}
                          {columnSelectionError && (
                            <p className="entities-column-error">{columnSelectionError}</p>
                          )}
                        </>
                      )}
                    </div>
                    <div className="entities-column-drawer-footer">
                      <div className="entities-column-footer-left">
                        <button
                          type="button"
                          className="btn secondary"
                          onClick={handleResetToBaseline}
                          disabled={columnsLoading || draftMatchesSystem}
                        >
                          Use system default
                        </button>
                      </div>
                      <div className="entities-column-footer-right">
                        <button
                          type="button"
                          className="btn submit"
                          onClick={() => handleSaveColumns(COLUMN_SCOPE_USER)}
                          disabled={columnsLoading || isSavingUserColumns || !isUserDirty}
                        >
                          {isSavingUserColumns ? 'Saving…' : 'Save for me'}
                        </button>
                        {isSystemAdmin && (
                          <div className="entities-column-admin">
                            <span className="entities-column-admin-label">
                              System settings (admin only)
                            </span>
                            <button
                              type="button"
                              className="btn secondary"
                              onClick={() => handleSaveColumns(COLUMN_SCOPE_SYSTEM)}
                              disabled={
                                columnsLoading || isSavingSystemColumns || !isSystemDirty
                              }
                              title="Set these columns as the default for all users"
                            >
                              {isSavingSystemColumns
                                ? 'Saving…'
                                : 'Set as system default'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <button
            type="button"
            className="icon-btn"
            title="Refresh entities"
            onClick={handleRefresh}
            disabled={loadingEntities || (!viewingUnassigned && !worldId)}
          >
            <RotateCcw size={16} />
          </button>
          <button
            type="button"
            className="btn submit"
            onClick={openCreate}
            disabled={!canManage || !worldId || loadingEntities || viewingUnassigned}
          >
            <Plus size={18} /> Add Entity
          </button>
        </div>
      </div>

      {viewingUnassigned && (
        <div className="alert info" role="status">
          Entities listed here do not have a world assigned. Open an entity to update its
          world from the entity detail view.
        </div>
      )}

      {toast && (
        <div className={`toast-banner ${toast.tone}`} role="status">
          {toast.message}
        </div>
      )}

      {entitiesError && (
        <div className="alert error" role="alert">
          {entitiesError}
        </div>
      )}

      {loadingEntities ? (
        <div className="empty-state">Loading entities...</div>
      ) : !worldId && !viewingUnassigned ? (
        <div className="empty-state">Select a campaign to view its entities.</div>
      ) : hasEntities ? (
        hasResults ? (
          <div className="entities-table-wrapper">
            <table className="entities-table">
              <thead>
                <tr>
                  {visibleColumnDefs.map((column) => {
                    const isSorted = dataExplorer.sortState.key === column.key
                    const isGrouped = dataExplorer.groupBy === column.key
                    return (
                      <th
                        key={column.key}
                        onClick={() => handleHeaderClick(column.key)}
                        onContextMenu={(event) => handleHeaderContextMenu(event, column)}
                        className="sortable-header"
                      >
                        <span className="header-label">
                          {column.label}
                          {isSorted && (
                            <span className="sort-indicator">
                              {dataExplorer.sortState.direction === 'asc' ? '▲' : '▼'}
                            </span>
                          )}
                          {isGrouped && <span className="group-indicator">Grouped</span>}
                        </span>
                      </th>
                    )
                  })}
                  {canManage && <th className="actions-column">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {dataExplorer.groupBy
                  ? dataExplorer.groups.map((group) => (
                      <Fragment key={group.id}>
                        <tr className="entities-group-row">
                          <td colSpan={visibleColumnDefs.length + (canManage ? 1 : 0)}>
                            <button
                              type="button"
                              className="group-toggle"
                              onClick={() => dataExplorer.toggleGroupCollapse(group.id)}
                              aria-label={`Toggle group ${formatGroupLabel(group.value)}`}
                            >
                              {dataExplorer.isGroupCollapsed(group.id) ? (
                                <ChevronRight size={14} />
                              ) : (
                                <ChevronDown size={14} />
                              )}
                            </button>
                            <span className="entities-group-label">
                              {formatGroupLabel(group.value)}{' '}
                              <span className="entities-group-count">({group.items.length})</span>
                            </span>
                          </td>
                        </tr>
                        {!dataExplorer.isGroupCollapsed(group.id) &&
                          group.items.map((entity) => (
                            <tr key={entity.id}>
                              {visibleColumnDefs.map((column) => (
                                <td key={column.key}>{renderEntityColumn(column, entity)}</td>
                              ))}
                              {canManage && (
                                <td className="actions-column">
                                  <div className="entity-actions">
                                    <button
                                      type="button"
                                      className="icon-btn"
                                      onClick={() => openEdit(entity)}
                                      title="Edit entity"
                                      disabled={loadingEntities}
                                    >
                                      <Pencil size={16} />
                                    </button>
                                    <button
                                      type="button"
                                      className="icon-btn danger"
                                      onClick={() => handleDelete(entity)}
                                      title="Delete entity"
                                      disabled={deletingId === entity.id}
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))}
                      </Fragment>
                    ))
                  : dataExplorer.data.map((entity) => (
                      <tr key={entity.id}>
                        {visibleColumnDefs.map((column) => (
                          <td key={column.key}>{renderEntityColumn(column, entity)}</td>
                        ))}
                        {canManage && (
                          <td className="actions-column">
                            <div className="entity-actions">
                              <button
                                type="button"
                                className="icon-btn"
                                onClick={() => openEdit(entity)}
                                title="Edit entity"
                                disabled={loadingEntities}
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                type="button"
                                className="icon-btn danger"
                                onClick={() => handleDelete(entity)}
                                title="Delete entity"
                                disabled={deletingId === entity.id}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <p className="empty-title">No entities match your filters.</p>
            <div className="empty-actions">
              {(dataExplorer.filterActive || dataExplorer.searchTerm) && (
                <div className="empty-action-buttons">
                  {dataExplorer.filterActive && (
                    <button
                      type="button"
                      className="btn secondary"
                      onClick={() => dataExplorer.clearFilters()}
                    >
                      Clear filters
                    </button>
                  )}
                  {dataExplorer.searchTerm && (
                    <button
                      type="button"
                      className="btn secondary"
                      onClick={() => dataExplorer.setSearchTerm('')}
                    >
                      Reset search
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      ) : (
        <div className="empty-state">
          {filterActive ? (
            <>
              <p className="empty-title">No entities of this type yet.</p>
              <button type="button" className="btn secondary" onClick={clearFilter}>
                View all entities
              </button>
            </>
          ) : canManage ? (
            <>
              <p className="empty-title">No entities yet.</p>
              <p>
                Click <strong>Add Entity</strong> to create your first entity.
              </p>
            </>
          ) : (
            <p>Nothing to show right now.</p>
          )}
        </div>
      )}

      {groupMenuState.open && (
        <div
          className="column-context-menu"
          style={{ top: groupMenuState.y, left: groupMenuState.x }}
          role="menu"
        >
          <button type="button" onClick={() => handleGroupByColumn(groupMenuState.columnKey)}>
            {dataExplorer.groupBy === groupMenuState.columnKey
              ? 'Remove grouping'
              : `Group by ${groupMenuState.columnLabel}`}
          </button>
          {dataExplorer.groupBy && dataExplorer.groupBy !== groupMenuState.columnKey && (
            <button type="button" onClick={() => handleGroupByColumn('')}>
              Clear grouping
            </button>
          )}
        </div>
      )}

      <ConditionBuilderModal
        open={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        fields={filterFields}
        value={dataExplorer.filters}
        onApply={(config) => {
          dataExplorer.setFilters(config)
          setFilterModalOpen(false)
        }}
      />

      <DrawerPanel
        isOpen={panelOpen}
        onClose={closePanel}
        title={entityDrawerTitle}
        width={420}
        footerActions={
          <>
            <button
              type="button"
              className="btn cancel"
              onClick={closePanel}
              disabled={entityFormUiState.cancelDisabled}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn submit"
              form={entityFormIdRef.current}
              disabled={entityFormUiState.submitDisabled}
            >
              {entityFormUiState.submitLabel}
            </button>
          </>
        }
      >
        <EntityForm
          worldId={viewingUnassigned ? '' : worldId}
          entityId={editingEntityId}
          onCancel={closePanel}
          onSaved={handleFormSaved}
          formId={entityFormIdRef.current}
          onStateChange={handleEntityFormStateChange}
          hideActions
          selectedEntityTypeId={filterActive ? selectedFilter : ''}
        />
      </DrawerPanel>
    </section>
  )
}
