import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getEntityTypes } from '../../api/entityTypes.js'
import {
  createEntity,
  getEntity,
  updateEntity,
} from '../../api/entities.js'
import { getFields as getEntityTypeFields } from '../../api/entityTypeFields.js'
import AccessSettingsEditor from '../../components/entities/AccessSettingsEditor.jsx'
import { fetchAccessOptionsForWorld } from '../../utils/entityAccessOptions.js'

const VISIBILITY_OPTIONS = [
  { value: 'hidden', label: 'Hidden' },
  { value: 'partial', label: 'Partial' },
  { value: 'visible', label: 'Visible' },
]

const buildEnumOptions = (field) => {
  const choices = field?.options?.choices
  if (!Array.isArray(choices) || choices.length === 0) return []

  return choices
    .map((choice, index) => {
      if (choice === null || choice === undefined) return null
      if (typeof choice === 'object') {
        const value =
          choice.value ??
          choice.id ??
          choice.key ??
          choice.slug ??
          `choice-${index}`
        const label =
          choice.label ??
          choice.name ??
          choice.title ??
          choice.display ??
          value
        if (value === null || value === undefined) return null
        return { value, label: String(label ?? value) }
      }
      const text = String(choice)
      return { value: text, label: text }
    })
    .filter(Boolean)
}

const normaliseDateInputValue = (value) => {
  if (!value) return ''
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10)
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return ''
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      return trimmed.slice(0, 10)
    }
    const date = new Date(trimmed)
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString().slice(0, 10)
    }
    return ''
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

const serialiseFieldValueForInput = (value, field) => {
  if (value === null || value === undefined) return ''

  const dataType = field?.dataType || field?.data_type

  switch (dataType) {
    case 'boolean': {
      if (typeof value === 'boolean') {
        return value ? 'true' : 'false'
      }
      if (typeof value === 'number') {
        return value !== 0 ? 'true' : 'false'
      }
      if (typeof value === 'string') {
        const lower = value.trim().toLowerCase()
        if (lower === 'true' || lower === 'false') {
          return lower
        }
      }
      return ''
    }
    case 'number':
      return value === '' ? '' : String(value)
    case 'date':
      return normaliseDateInputValue(value)
    default:
      return String(value)
  }
}

const coerceFieldValueForSubmit = (value, field) => {
  const dataType = field?.dataType || field?.data_type
  if (value === undefined || value === null) return undefined

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (dataType !== 'boolean' && trimmed === '') {
      return ''
    }
    value = trimmed
  }

  switch (dataType) {
    case 'number': {
      if (value === '') return ''
      const numeric = Number(value)
      return Number.isNaN(numeric) ? value : numeric
    }
    case 'boolean': {
      if (typeof value === 'boolean') return value
      if (typeof value === 'number') return value !== 0
      if (typeof value === 'string') {
        const lower = value.toLowerCase()
        if (lower === 'true') return true
        if (lower === 'false') return false
      }
      return value
    }
    default:
      return value
  }
}

const ADVANCED_SECTION_KEY = 'entity-form-advanced-open'

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

const coerceMetadataValue = (value) => {
  const trimmed = value.trim()
  if (trimmed.length === 0) return ''
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
  return value
}

export default function EntityForm({
  worldId,
  entityId,
  onCancel,
  onSaved,
  formId = 'entity-form',
  onStateChange,
  hideActions = false,
  selectedEntityTypeId = '',
  activeView = 'details',
  onViewChange,
}) {
  const isEditMode = Boolean(entityId)
  const pairIdRef = useRef(0)

  const generatePair = useCallback(
    (key = '', value = '') => {
      pairIdRef.current += 1
      return {
        id: pairIdRef.current,
        key,
        value,
      }
    },
    [pairIdRef],
  )

  const [entityTypes, setEntityTypes] = useState([])
  const [loadingTypes, setLoadingTypes] = useState(false)
  const [loadingEntity, setLoadingEntity] = useState(false)
  const [loadingMetadataFields, setLoadingMetadataFields] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [values, setValues] = useState({
    name: '',
    description: '',
    entityTypeId: selectedEntityTypeId || '',
    visibility: 'visible',
  })
  const [metadataPairs, setMetadataPairs] = useState(() => {
    pairIdRef.current = 0
    return [generatePair()]
  })
  const [metadataFieldDefs, setMetadataFieldDefs] = useState([])
  const [metadataValues, setMetadataValues] = useState({})
  const [accessSettings, setAccessSettings] = useState({
    readMode: 'global',
    readCampaigns: [],
    readUsers: [],
    writeMode: 'global',
    writeCampaigns: [],
    writeUsers: [],
  })
  const [accessOptions, setAccessOptions] = useState({ campaigns: [], users: [] })
  const [accessOptionsLoading, setAccessOptionsLoading] = useState(false)
  const [accessOptionsError, setAccessOptionsError] = useState('')
  const accessOptionsLoadedRef = useRef(false)
  const [showAdvanced, setShowAdvanced] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      const stored = window.sessionStorage?.getItem(ADVANCED_SECTION_KEY)
      return stored === 'true'
    } catch (err) {
      console.warn('⚠️ Unable to read advanced options preference', err)
      return false
    }
  })

  const hasMetadata = useMemo(
    () => metadataPairs.some((pair) => pair.key.trim() !== '' || pair.value.trim() !== ''),
    [metadataPairs],
  )

  const ensureAtLeastOnePair = useCallback(
    (pairs) => {
      if (pairs.length > 0) return pairs
      return [generatePair()]
    },
    [generatePair],
  )

  const normaliseMetadataPairs = useCallback(
    (metadata) => {
      pairIdRef.current = 0
      if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
        return [generatePair()]
      }

      const entries = Object.entries(metadata)
      if (entries.length === 0) {
        return [generatePair()]
      }

      return entries.map(([key, value]) => generatePair(key, normaliseValueForInput(value)))
    },
    [generatePair],
  )

  useEffect(() => {
    let cancelled = false

    const loadEntityTypes = async () => {
      if (!cancelled) {
        setError('')
      }
      if (!worldId) {
        setEntityTypes([])
        setLoadingTypes(false)
        return
      }

      setLoadingTypes(true)
      try {
        const response = await getEntityTypes({ worldId })
        const list = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
            ? response.data
            : []
        if (!cancelled) {
          const normalised = list
            .map((type) => {
              const id = type?.id || type?.entity_type_id || type?.entityTypeId || ''
              if (!id) return null
              return {
                id,
                name: type?.name || type?.label || type?.title || 'Untitled',
              }
            })
            .filter(Boolean)
          setEntityTypes(normalised)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load entity types')
          setEntityTypes([])
        }
      } finally {
        if (!cancelled) {
          setLoadingTypes(false)
        }
      }
    }

    loadEntityTypes()
    return () => {
      cancelled = true
    }
  }, [worldId])

  useEffect(() => {
    if (!worldId) {
      setValues((prev) => ({ ...prev, entityTypeId: '' }))
      return
    }

    setValues((prev) => {
      if (!prev.entityTypeId) return prev
      const exists = entityTypes.some((type) => type.id === prev.entityTypeId)
      if (exists) return prev
      return { ...prev, entityTypeId: '' }
    })
  }, [worldId, entityTypes])

  useEffect(() => {
    let cancelled = false

    const resetForm = () => {
      pairIdRef.current = 0
      setValues({
        name: '',
        description: '',
        entityTypeId: selectedEntityTypeId || '',
        visibility: 'visible',
      })
      setMetadataPairs([generatePair()])
      setMetadataFieldDefs([])
      setMetadataValues({})
      setError('')
      onViewChange?.('details')
      setAccessSettings({
        readMode: 'global',
        readCampaigns: [],
        readUsers: [],
        writeMode: 'global',
        writeCampaigns: [],
        writeUsers: [],
      })
      accessOptionsLoadedRef.current = false
      setAccessOptions({ campaigns: [], users: [] })
      setAccessOptionsError('')
    }

    if (!isEditMode) {
      resetForm()
      setLoadingEntity(false)
      return () => {}
    }

    const loadEntity = async () => {
      setLoadingEntity(true)
      setError('')
      try {
        const response = await getEntity(entityId)
        const data = response?.data || response
        if (!data) {
          throw new Error('Entity not found')
        }

        if (!cancelled) {
          const metadataList = normaliseMetadataPairs(data.metadata)
          setValues({
            name: data.name || '',
            description: data.description || '',
            entityTypeId: data.entity_type_id || data.entityType?.id || '',
            visibility: data.visibility || 'visible',
          })
          setMetadataPairs(ensureAtLeastOnePair(metadataList))
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load entity')
        }
      } finally {
        if (!cancelled) {
          setLoadingEntity(false)
        }
      }
    }

    loadEntity()
    return () => {
      cancelled = true
    }
  }, [
    entityId,
    isEditMode,
    ensureAtLeastOnePair,
    generatePair,
    normaliseMetadataPairs,
    selectedEntityTypeId,
    onViewChange,
  ])

  const handleInputChange = (field) => (event) => {
    const { value } = event.target
    setValues((prev) => ({ ...prev, [field]: value }))
  }

  const handleMetadataChange = (id, field) => (event) => {
    const { value } = event.target
    setMetadataPairs((prev) =>
      prev.map((pair) => (pair.id === id ? { ...pair, [field]: value } : pair)),
    )
  }

  const handleAddPair = () => {
    setMetadataPairs((prev) => [...prev, generatePair()])
  }

  const handleRemovePair = (id) => {
    setMetadataPairs((prev) => ensureAtLeastOnePair(prev.filter((pair) => pair.id !== id)))
  }

  const handleMetadataFieldChange = (fieldName) => (event) => {
    const { value } = event.target
    setMetadataValues((prev) => ({ ...prev, [fieldName]: value }))
  }

  const handleAccessSettingChange = useCallback((key, value) => {
    setAccessOptionsError('')
    setAccessSettings((prev) => {
      const next = { ...prev }

      if (key === 'readMode' || key === 'writeMode') {
        const mode = typeof value === 'string' ? value.trim().toLowerCase() : 'global'
        if (key === 'readMode') {
          next.readMode = ['global', 'selective', 'hidden'].includes(mode)
            ? mode
            : 'global'
          if (next.readMode !== 'selective') {
            next.readCampaigns = []
            next.readUsers = []
          }
        } else {
          next.writeMode = ['global', 'selective', 'hidden'].includes(mode)
            ? mode
            : 'global'
          if (next.writeMode !== 'selective') {
            next.writeCampaigns = []
            next.writeUsers = []
          }
        }
        return next
      }

      if (['readCampaigns', 'readUsers', 'writeCampaigns', 'writeUsers'].includes(key)) {
        next[key] = Array.isArray(value)
          ? value.map((entry) => String(entry).trim()).filter(Boolean)
          : []
        return next
      }

      next[key] = value
      return next
    })
  }, [])

  useEffect(() => {
    accessOptionsLoadedRef.current = false
    setAccessOptions({ campaigns: [], users: [] })
    setAccessOptionsError('')
  }, [worldId])

  useEffect(() => {
    if (activeView !== 'access') return
    if (!worldId) return
    if (accessOptionsLoadedRef.current) return

    let cancelled = false
    setAccessOptionsLoading(true)
    setAccessOptionsError('')

    const load = async () => {
      try {
        const options = await fetchAccessOptionsForWorld(worldId)
        if (cancelled) return
        setAccessOptions(options)
        accessOptionsLoadedRef.current = true
      } catch (err) {
        if (cancelled) return
        setAccessOptions({ campaigns: [], users: [] })
        setAccessOptionsError(err.message || 'Failed to load access options')
        accessOptionsLoadedRef.current = false
      } finally {
        if (!cancelled) {
          setAccessOptionsLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [activeView, worldId])

  const handleToggleAdvanced = useCallback(() => {
    setShowAdvanced((prev) => {
      const next = !prev
      try {
        if (typeof window !== 'undefined') {
          window.sessionStorage?.setItem(ADVANCED_SECTION_KEY, next ? 'true' : 'false')
        }
      } catch (err) {
        console.warn('⚠️ Unable to persist advanced options preference', err)
      }
      return next
    })
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!worldId && !isEditMode) {
      setError('A world must be selected before creating an entity.')
      return
    }

    const trimmedName = values.name.trim()
    if (!trimmedName) {
      setError('Name is required.')
      return
    }

    const entityTypeId = values.entityTypeId || selectedEntityTypeId || ''
    if (!entityTypeId) {
      setError('Entity type is required.')
      return
    }

    const visibility = isEditMode ? values.visibility || 'visible' : 'visible'
    if (isEditMode && !VISIBILITY_OPTIONS.some((option) => option.value === visibility)) {
      setError('Invalid visibility selected.')
      return
    }

    let metadataPayload = {}

    if (isEditMode) {
      metadataPairs.forEach(({ key, value }) => {
        const trimmedKey = key.trim()
        if (!trimmedKey) return
        metadataPayload[trimmedKey] = coerceMetadataValue(value)
      })
    } else if (metadataFieldDefs.length > 0) {
      const payload = {}
      for (const field of metadataFieldDefs) {
        const key = field.name
        const rawValue = metadataValues[key]
        const hasValue =
          rawValue !== undefined &&
          rawValue !== null &&
          (typeof rawValue !== 'string' || rawValue.trim() !== '')

        if (field.required && !hasValue) {
          const label = field.label || field.name
          setError(`${label} is required.`)
          return
        }

        if (!hasValue) {
          continue
        }

        payload[key] = coerceFieldValueForSubmit(rawValue, field)
      }
      metadataPayload = payload
    }

    const descriptionValue = values.description ? values.description.trim() : ''

    const payload = {
      name: trimmedName,
      description: descriptionValue,
      visibility,
      metadata: metadataPayload,
      entity_type_id: entityTypeId,
    }

    try {
      setSaving(true)
      setError('')
      if (isEditMode) {
        await updateEntity(entityId, payload)
      } else {
        const accessPayload = {
          read_access: accessSettings.readMode,
          write_access: accessSettings.writeMode,
          read_campaign_ids:
            accessSettings.readMode === 'selective' ? accessSettings.readCampaigns : [],
          read_user_ids:
            accessSettings.readMode === 'selective' ? accessSettings.readUsers : [],
          write_campaign_ids:
            accessSettings.writeMode === 'selective' ? accessSettings.writeCampaigns : [],
          write_user_ids:
            accessSettings.writeMode === 'selective' ? accessSettings.writeUsers : [],
        }

        await createEntity({ ...payload, ...accessPayload, world_id: worldId })
      }
      onSaved?.(isEditMode ? 'edit' : 'create')
    } catch (err) {
      setError(err.message || 'Failed to save entity')
    } finally {
      setSaving(false)
    }
  }

  const isBusy = loadingTypes || loadingEntity || loadingMetadataFields
  const canUseAccessSettings = !isEditMode
  const isAccessView = canUseAccessSettings && activeView === 'access'

  useEffect(() => {
    if (!onViewChange) return
    if (!canUseAccessSettings && activeView !== 'details') {
      onViewChange('details')
      return
    }
    if (isAccessView && !worldId) {
      onViewChange('details')
    }
  }, [activeView, canUseAccessSettings, isAccessView, onViewChange, worldId])

  useEffect(() => {
    if (!onStateChange) return
    const mode = isEditMode ? 'edit' : 'create'
    onStateChange({
      mode,
      saving,
      isBusy,
      submitLabel: saving ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Entity',
      submitDisabled: saving || isBusy,
      cancelDisabled: saving,
      accessButtonVisible: canUseAccessSettings,
      accessButtonDisabled: saving || isBusy || (!worldId && !isAccessView),
    })
  }, [
    onStateChange,
    isEditMode,
    saving,
    isBusy,
    canUseAccessSettings,
    isAccessView,
    worldId,
  ])

  useEffect(() => {
    if (isEditMode) return
    setValues((prev) => ({ ...prev, entityTypeId: selectedEntityTypeId || '' }))
  }, [isEditMode, selectedEntityTypeId])

  useEffect(() => {
    if (isEditMode) {
      setMetadataFieldDefs([])
      setMetadataValues({})
      return
    }

    if (!selectedEntityTypeId) {
      setMetadataFieldDefs([])
      setMetadataValues({})
      return
    }

    let cancelled = false

    const loadMetadataFields = async () => {
      setLoadingMetadataFields(true)
      try {
        const response = await getEntityTypeFields(selectedEntityTypeId)
        const list = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
            ? response.data
            : []

        if (cancelled) return

        const normalised = list
          .map((field) => {
            if (!field) return null
            const name = field.name || field.field_name
            if (!name) return null
            const dataType = field.data_type || field.dataType || 'text'
            return {
              id: field.id || name,
              name,
              label: field.label || field.name || name,
              dataType,
              required: Boolean(field.required),
              options: field.options || {},
              defaultValue: field.default_value ?? field.defaultValue ?? null,
            }
          })
          .filter(Boolean)

        setMetadataFieldDefs(normalised)

        const defaults = {}
        normalised.forEach((field) => {
          const defaultValue = field.defaultValue
          if (defaultValue !== undefined && defaultValue !== null && defaultValue !== '') {
            defaults[field.name] = serialiseFieldValueForInput(defaultValue, field)
          } else {
            defaults[field.name] = ''
          }
        })
        setMetadataValues(defaults)
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load metadata fields')
          setMetadataFieldDefs([])
          setMetadataValues({})
        }
      } finally {
        if (!cancelled) {
          setLoadingMetadataFields(false)
        }
      }
    }

    loadMetadataFields()

    return () => {
      cancelled = true
    }
  }, [isEditMode, selectedEntityTypeId])

  const selectedEntityType = useMemo(() => {
    const id = values.entityTypeId || selectedEntityTypeId || ''
    if (!id) return null
    return entityTypes.find((type) => type.id === id) || null
  }, [entityTypes, values.entityTypeId, selectedEntityTypeId])

  const renderMetadataFieldInput = (field) => {
    const fieldId = `metadata-field-${field.id}`
    const value = metadataValues[field.name] ?? ''
    const isRequired = Boolean(field.required)

    switch (field.dataType) {
      case 'boolean':
        return (
          <select
            id={fieldId}
            value={value}
            onChange={handleMetadataFieldChange(field.name)}
            disabled={saving || loadingMetadataFields}
            required={isRequired}
          >
            <option value="">Select...</option>
            <option value="true">True</option>
            <option value="false">False</option>
          </select>
        )
      case 'enum': {
        const options = buildEnumOptions(field)
        return (
          <select
            id={fieldId}
            value={value}
            onChange={handleMetadataFieldChange(field.name)}
            disabled={saving || loadingMetadataFields}
            required={isRequired}
          >
            <option value="">Select...</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )
      }
      case 'number':
        return (
          <input
            id={fieldId}
            type="number"
            value={value}
            onChange={handleMetadataFieldChange(field.name)}
            disabled={saving || loadingMetadataFields}
            required={isRequired}
          />
        )
      case 'text':
        return (
          <textarea
            id={fieldId}
            value={value}
            onChange={handleMetadataFieldChange(field.name)}
            disabled={saving || loadingMetadataFields}
            rows={4}
            required={isRequired}
          />
        )
      case 'date':
        return (
          <input
            id={fieldId}
            type="date"
            value={value}
            onChange={handleMetadataFieldChange(field.name)}
            disabled={saving || loadingMetadataFields}
            required={isRequired}
          />
        )
      default:
        return (
          <input
            id={fieldId}
            type="text"
            value={value}
            onChange={handleMetadataFieldChange(field.name)}
            disabled={saving || loadingMetadataFields}
            required={isRequired}
          />
        )
    }
  }

  const entityTypeLocked = !isEditMode && Boolean(selectedEntityTypeId)
  const showMetadataSection = !isEditMode && metadataFieldDefs.length > 0

  const renderTypeField = () => (
    <div className="form-group">
      <label htmlFor="entity-type">Type *</label>
      {entityTypeLocked ? (
        <input
          id="entity-type"
          type="text"
          value={selectedEntityType?.name || '—'}
          readOnly
          disabled
        />
      ) : (
        <select
          id="entity-type"
          value={values.entityTypeId}
          onChange={handleInputChange('entityTypeId')}
          disabled={saving || loadingTypes}
          required
        >
          <option value="">Select type...</option>
          {entityTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
      )}
    </div>
  )

  return (
    <form id={formId} className="entity-form" onSubmit={handleSubmit}>
      {isBusy ? (
        <div className="form-loading">Loading...</div>
      ) : (
        <>
        {isAccessView ? (
          <section className="entity-card entity-access-card drawer-access-card">
            <h3 className="entity-card-title">Manage access</h3>
            <p className="entity-access-note help-text">
              Configure who can view and edit this entity. Users with write access will
              automatically receive read access.
            </p>

            {accessOptionsError && (
              <div className="alert error" role="alert">
                {accessOptionsError}
              </div>
            )}

            {!worldId ? (
              <p className="entity-empty-state">
                Assign this entity to a world to configure access settings.
              </p>
            ) : (
              <AccessSettingsEditor
                canEdit={!saving}
                accessSettings={accessSettings}
                accessOptions={accessOptions}
                accessOptionsLoading={accessOptionsLoading}
                accessSaving={saving}
                onSettingChange={handleAccessSettingChange}
                idPrefix="entity-create-access"
              />
            )}
          </section>
        ) : (
          <>
            <div className="form-group">
              <label htmlFor="entity-name">Name *</label>
              <input
                id="entity-name"
                type="text"
                value={values.name}
                onChange={handleInputChange('name')}
                placeholder="e.g. Waterdeep"
                disabled={saving}
                required
                data-autofocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="entity-description">Description</label>
              <textarea
                id="entity-description"
                value={values.description}
                onChange={handleInputChange('description')}
                placeholder="Optional summary of the entity"
                rows={4}
                disabled={saving}
              />
            </div>

            {!isEditMode && renderTypeField()}

            {showMetadataSection && (
              <div className="metadata-field-section">
                <h3>Information</h3>
                {metadataFieldDefs.map((field) => (
                  <div className="form-group" key={field.id}>
                    <label htmlFor={`metadata-field-${field.id}`}>
                      {field.label}
                      {field.required ? ' *' : ''}
                    </label>
                    {renderMetadataFieldInput(field)}
                  </div>
                ))}
              </div>
            )}

            {canUseAccessSettings && !worldId && (
              <p className="help-text">Assign a world to configure access controls.</p>
            )}

            {isEditMode && (
              <div className="form-two-column">{renderTypeField()}</div>
            )}

            {isEditMode && (
              <div className="advanced-options">
                <button
                  type="button"
                  className="advanced-options-toggle"
                  onClick={handleToggleAdvanced}
                  aria-expanded={showAdvanced}
                >
                  <span>Advanced options</span>
                  {hasMetadata ? (
                    <span className="advanced-indicator">Metadata added</span>
                  ) : null}
                  <span className="advanced-chevron" aria-hidden="true">
                    {showAdvanced ? '▴' : '▾'}
                  </span>
                </button>

                {showAdvanced && (
                  <div className="advanced-options-body">
                    <div className="metadata-editor">
                      <div className="metadata-header">
                        <h3>Metadata {hasMetadata ? '' : '(optional)'}</h3>
                        <button
                          type="button"
                          className="btn neutral"
                          onClick={handleAddPair}
                          disabled={saving}
                        >
                          Add field
                        </button>
                      </div>

                      <div className="metadata-list">
                        {metadataPairs.map((pair, index) => (
                          <div className="metadata-row" key={pair.id}>
                            <div className="form-group">
                              <label htmlFor={`metadata-key-${pair.id}`} className="sr-only">
                                Metadata key {index + 1}
                              </label>
                              <input
                                id={`metadata-key-${pair.id}`}
                                type="text"
                                placeholder="Key"
                                value={pair.key}
                                onChange={handleMetadataChange(pair.id, 'key')}
                                disabled={saving}
                              />
                            </div>
                            <div className="form-group">
                              <label htmlFor={`metadata-value-${pair.id}`} className="sr-only">
                                Metadata value {index + 1}
                              </label>
                              <input
                                id={`metadata-value-${pair.id}`}
                                type="text"
                                placeholder="Value"
                                value={pair.value}
                                onChange={handleMetadataChange(pair.id, 'value')}
                                disabled={saving}
                              />
                            </div>
                            <div className="metadata-actions">
                              <button
                                type="button"
                                className="icon-btn"
                                onClick={() => handleRemovePair(pair.id)}
                                disabled={saving || metadataPairs.length === 1}
                                title="Remove field"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
        </>
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
            {saving ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Entity'}
          </button>
        </div>
      )}
    </form>
  )
}
