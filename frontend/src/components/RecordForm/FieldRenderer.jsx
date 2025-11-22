import { useCallback, useEffect, useMemo, useState } from 'react'
import ListCollector from '../ListCollector.jsx'
import { normaliseListCollectorOption } from '../listCollectorUtils.js'
import { getAuthToken } from '../../utils/authHelpers.js'
import EntitySearchSelect from '../../modules/relationships3/ui/EntitySearchSelect.jsx'
import EntityInfoPreview from '../entities/EntityInfoPreview.jsx'
import { extractReferenceEntityId, extractReferenceEntityName } from '../../utils/metadataFieldUtils.js'

export default function FieldRenderer({ field, data, onChange, mode = 'edit' }) {
  const key = field.key || field.name || field.field || ''
  const [dynamicOptions, setDynamicOptions] = useState([])
  const [optionsLoaded, setOptionsLoaded] = useState(!field.optionsSource)
  const [criteriaSignature, setCriteriaSignature] = useState(() =>
    JSON.stringify(field.optionsCriteria ?? null)
  )
  const [referenceState, setReferenceState] = useState(() => ({
    selectedLabel: field?.selectedLabel ? String(field.selectedLabel) : '',
    selectedValue: null,
  }))
  const isViewMode = mode === 'view'

  // 🔐 Wait for token before fetching dynamic options
  async function waitForToken(retries = 5, delay = 200) {
    for (let i = 0; i < retries; i++) {
      const token = getAuthToken()
      if (token) return token
      await new Promise((res) => setTimeout(res, delay))
    }
    return null
  }

  const serialiseCriteria = useCallback((criteria) => {
    if (criteria === undefined || criteria === null) return 'null'
    try {
      return JSON.stringify(criteria)
    } catch (err) {
      console.warn('⚠️ Unable to serialise options criteria', err)
      return String(criteria)
    }
  }, [])

  useEffect(() => {
    const signature = serialiseCriteria(field.optionsCriteria ?? null)
    setCriteriaSignature((prev) => (prev === signature ? prev : signature))
  }, [field.optionsCriteria, serialiseCriteria])

  // 🔄 Fetch options dynamically if `optionsSource` provided
  useEffect(() => {
    let isMounted = true

    const loadOptions = async () => {
      if (!field.optionsSource) {
        if (isMounted) {
          setDynamicOptions([])
          setOptionsLoaded(true)
        }
        return
      }

      const { API_BASE } = await import('../../api/config.js')
      let endpoint = null
      const searchParams = new URLSearchParams()
      let criteriaOverride = null

      const extractWorldId = (criteria) => {
        if (criteria === undefined || criteria === null) return null
        if (typeof criteria === 'string') {
          const params = new URLSearchParams(criteria)
          return params.get('world_id') || params.get('worldId')
        }
        if (Array.isArray(criteria)) {
          for (const entry of criteria) {
            if (Array.isArray(entry) && entry.length >= 2) {
              const [key, value] = entry
              if (key === 'world_id' || key === 'worldId') return value
            } else if (entry && typeof entry === 'object') {
              const nested = extractWorldId(entry)
              if (nested) return nested
            }
          }
          return null
        }
        if (typeof criteria === 'object') {
          return criteria.world_id || criteria.worldId || null
        }
        return null
      }

      const sanitiseEntityCriteria = (criteria) => {
        if (criteria === undefined || criteria === null) return null
        if (typeof criteria === 'string') {
          const params = new URLSearchParams(criteria)
          params.delete('world_id')
          params.delete('worldId')
          const serialised = params.toString()
          return serialised ? serialised : null
        }
        if (Array.isArray(criteria)) {
          const filtered = criteria
            .map((entry) => {
              if (Array.isArray(entry) && entry.length >= 2) {
                const [key, value] = entry
                if (key === 'world_id' || key === 'worldId') return null
                return [key, value]
              }
              if (entry && typeof entry === 'object') {
                const sanitised = sanitiseEntityCriteria(entry)
                if (!sanitised) return null
                return sanitised
              }
              return entry
            })
            .filter((entry) => {
              if (entry === null || entry === undefined) return false
              if (Array.isArray(entry)) return true
              if (typeof entry === 'object') {
                return Object.keys(entry).length > 0
              }
              return true
            })
          return filtered.length > 0 ? filtered : null
        }
        if (typeof criteria === 'object') {
          const clone = { ...criteria }
          delete clone.world_id
          delete clone.worldId
          return Object.keys(clone).length > 0 ? clone : null
        }
        return criteria
      }

      switch (field.optionsSource) {
        case 'worlds':
          endpoint = '/worlds'
          break
        case 'campaigns':
          endpoint = '/campaigns'
          break
        case 'entities': {
          const criteriaWorldId = extractWorldId(field.optionsCriteria)
          const fallbackWorldId =
            field.worldId || field.world_id || data?.world_id || data?.worldId || null
          const worldId = criteriaWorldId || fallbackWorldId

          if (!worldId) {
            console.warn('⚠️ Unable to resolve world id for entity options')
            endpoint = null
            break
          }

          endpoint = `/worlds/${worldId}/entities`
          criteriaOverride = sanitiseEntityCriteria(field.optionsCriteria)
          break
        }
        case 'users':
          endpoint = '/users'
          break
        case 'players': {
          endpoint = '/users'
          const roles = field.roles || 'player,user'
          if (roles) searchParams.set('roles', roles)
          break
        }
        default:
          endpoint = null
      }

      if (!endpoint) {
        if (isMounted) {
          setDynamicOptions([])
          setOptionsLoaded(true)
        }
        return
      }

      const resolveUrl = () => {
        try {
          let url
          if (endpoint.startsWith('http')) {
            url = new URL(endpoint)
          } else {
            // Properly append endpoint to API_BASE
            // Remove trailing slash from base and leading slash from endpoint to avoid double slashes
            const baseUrl = API_BASE.replace(/\/$/, '')
            const endpointPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
            url = new URL(`${baseUrl}${endpointPath}`)
          }
          searchParams.forEach((value, key) => {
            if (value !== undefined && value !== null) {
              url.searchParams.append(key, value)
            }
          })

          const criteria = criteriaOverride ?? field.optionsCriteria
          const appendCriteria = (criteria) => {
            if (!criteria && criteria !== 0) return
            if (typeof criteria === 'string') {
              const params = new URLSearchParams(criteria)
              params.forEach((val, key) => {
                url.searchParams.append(key, val)
              })
              return
            }
            if (Array.isArray(criteria)) {
              criteria.forEach((entry) => {
                if (Array.isArray(entry) && entry.length >= 2) {
                  const [key, value] = entry
                  if (value === undefined || value === null) return
                  if (Array.isArray(value)) {
                    value.forEach((item) => {
                      if (item !== undefined && item !== null) {
                        url.searchParams.append(key, item)
                      }
                    })
                  } else {
                    url.searchParams.append(key, value)
                  }
                  return
                }
                if (typeof entry === 'object' && entry !== null) {
                  appendCriteria(entry)
                }
              })
              return
            }
            if (typeof criteria === 'object') {
              Object.entries(criteria).forEach(([key, val]) => {
                if (val === undefined || val === null) return
                if (Array.isArray(val)) {
                  val.forEach((item) => {
                    if (item !== undefined && item !== null) {
                      url.searchParams.append(key, item)
                    }
                  })
                } else {
                  url.searchParams.append(key, val)
                }
              })
            }
          }

          appendCriteria(criteria)
          return url
        } catch (err) {
          console.error('❌ Failed to construct options endpoint URL', err)
          return null
        }
      }

      const url = resolveUrl()

      if (!url) {
        if (isMounted) {
          setDynamicOptions([])
          setOptionsLoaded(true)
        }
        return
      }

      if (isMounted) {
        setOptionsLoaded(false)
      }

      try {
        const token = await waitForToken()
        if (!token) {
          console.warn('⚠️ No auth token available when loading options')
          if (isMounted) setOptionsLoaded(true)
          return
        }

        const res = await fetch(url, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        })

        // Check if response is actually JSON before parsing
        const contentType = res.headers.get('content-type')
        if (!contentType || !contentType.includes('application/json')) {
          const text = await res.text()
          console.error(`❌ ${field.optionsSource} returned non-JSON response:`, {
            status: res.status,
            statusText: res.statusText,
            contentType,
            url: url.toString(),
            preview: text.substring(0, 200),
          })
          if (isMounted) setOptionsLoaded(true)
          return
        }

        const json = await res.json()
        if (!res.ok) {
          console.warn(`⚠️ ${field.optionsSource} fetch failed`, json)
          if (isMounted) setOptionsLoaded(true)
          return
        }

        if (field.optionsSource === 'worlds') {
          console.log('🌍 Worlds response:', json)
        }

        const toOption = (item) => {
          if (!item || typeof item !== 'object') return null

          const valueKey = field.optionValueKey || 'id'
          const labelKey = field.optionLabelKey || 'name'

          const value = item?.[valueKey] ?? item?.id ?? null
          if (!value) return null

          let label = item?.[labelKey]
          if (!label) {
            const fallbacks = ['name', 'title', 'username']
            for (const fallbackKey of fallbacks) {
              if (item?.[fallbackKey]) {
                label = item[fallbackKey]
                break
              }
            }
          }

          if (!label) label = String(value)

          return { value, label }
        }

        // Handle different response formats
        const dataArray = Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json)
          ? json
          : []

        const options = dataArray.map(toOption).filter(Boolean)

        if (isMounted) {
          setDynamicOptions(options)
          setOptionsLoaded(true)

          if (options.length === 0) {
            console.warn(`⚠️ ${field.optionsSource} returned no data`, json)
          }
        }
      } catch (err) {
        console.error(`❌ Failed to load ${field.optionsSource}:`, err)
        if (isMounted) setOptionsLoaded(true)
      }
    }

    loadOptions()

    return () => {
      isMounted = false
    }
  }, [
    field.optionsSource,
    field.optionLabelKey,
    field.optionValueKey,
    criteriaSignature,
    field.roles,
    field.worldId,
    field.world_id,
    data?.world_id,
    data?.worldId,
  ])

  useEffect(() => {
    if (!field?.selectedLabel) return
    setReferenceState((prev) => {
      if (prev.selectedLabel === String(field.selectedLabel)) return prev
      return { ...prev, selectedLabel: String(field.selectedLabel) }
    })
  }, [field?.selectedLabel])

  const label = field.label || key
  const type = (field.type || 'text').toLowerCase()
  const referenceTypeId =
    field.referenceTypeId ?? field.reference_type_id ?? field.referenceType?.id ?? null
  const referenceTypeName =
    field.referenceTypeName ?? field.reference_type_name ?? field.referenceType?.name ?? ''
  const rawValue = key.includes('.')
    ? key.split('.').reduce((acc, k) => (acc ? acc[k] : undefined), data)
    : data?.[key]

  const normalisedValue = (() => {
    if (['checkbox', 'boolean'].includes(type)) {
      return !!rawValue
    }

    if (type === 'multiselect') {
      if (Array.isArray(rawValue)) {
        return rawValue
          .map((value) => {
            if (value === null || value === undefined) return null
            if (typeof value === 'object') {
              const valueKey = field.optionValueKey || 'id'
              const extracted =
                value?.[valueKey] ?? value?.id ?? value?.value ?? value?.key ?? null
              if (extracted === null || extracted === undefined) return null
              return String(extracted)
            }
            return String(value)
          })
          .filter((val) => val !== null && val !== undefined)
      }
      if (typeof rawValue === 'string' && rawValue.length > 0) {
        return rawValue.split(',').map((value) => value.trim()).filter(Boolean)
      }
      return []
    }

    return rawValue ?? ''
  })()

  const readonlyField = field.readonly || field.disabled
  const isReadOnly = isViewMode || readonlyField

  const formattedValue = (val) => {
    if (val === null || val === undefined || val === '') return '—'
    if (Array.isArray(val)) {
      return val.length > 0 ? val.join(', ') : '—'
    }
    if (typeof val === 'boolean') return val ? 'Yes' : 'No'
    return String(val)
  }

  const safeValue = formattedValue(normalisedValue)

  const handleChange = (e) => onChange?.(key, e.target.value)
  const handleCheck = (e) => onChange?.(key, e.target.checked)
  const readValueByPath = useCallback((source, path) => {
    if (!path || typeof path !== 'string') return undefined
    if (!source || typeof source !== 'object') return undefined
    if (!path.includes('.')) return source?.[path]
    return path
      .split('.')
      .filter((segment) => segment.length > 0)
      .reduce((acc, segment) => {
        if (acc === null || acc === undefined) return undefined
        if (typeof acc !== 'object') return undefined
        return acc[segment]
      }, source)
  }, [])

  const resolveWorldId = useCallback(() => {
    const candidates = [
      field.worldId,
      field.world_id,
      data?.worldId,
      data?.world_id,
    ]

    if (field.world && typeof field.world === 'object') {
      candidates.push(field.world.id, field.world.world_id)
    }

    if (data?.world && typeof data.world === 'object') {
      candidates.push(data.world.id, data.world.world_id)
    }

    if (data?.metadata && typeof data.metadata === 'object') {
      candidates.push(data.metadata.worldId, data.metadata.world_id)
    }

    for (const candidate of candidates) {
      if (candidate === null || candidate === undefined) continue
      const str = String(candidate).trim()
      if (str) return str
    }

    return ''
  }, [
    field.worldId,
    field.world_id,
    field.world,
    data?.worldId,
    data?.world_id,
    data?.world,
    data?.metadata,
  ])

  const isReferenceType = type === 'reference' || type === 'entity_reference' || type === 'location_reference'
  
  const referenceValue =
    isReferenceType && normalisedValue !== undefined && normalisedValue !== null
      ? String(normalisedValue)
      : ''

  const staticReferenceOptions = useMemo(() => {
    if (!isReferenceType) return []
    const choices = field.options?.choices
    if (!Array.isArray(choices)) return []
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
          if (value === undefined || value === null) return null
          const label =
            choice.label ??
            choice.name ??
            choice.title ??
            choice.display ??
            choice.displayName ??
            value
          return { value: String(value), label: String(label) }
        }
        const text = String(choice)
        return { value: text, label: text }
      })
      .filter(Boolean)
  }, [type, field.options?.choices])

  useEffect(() => {
    if (type !== 'reference') return
    if (referenceValue) return
    setReferenceState((prev) => {
      if (!prev.selectedLabel && !prev.selectedValue) return prev
      return { ...prev, selectedLabel: '', selectedValue: null }
    })
  }, [type, referenceValue])

  useEffect(() => {
    if (type !== 'reference') return
    if (!referenceValue) return

    const staticMatch = staticReferenceOptions.find(
      (option) => option.value === referenceValue,
    )

    const fallbackLabel = (() => {
      if (typeof field.value === 'object' && field.value !== null) {
        const candidate =
          field.value.label ??
          field.value.name ??
          field.value.title ??
          field.value.display ??
          field.value.displayName ??
          field.value.text ??
          field.value.value ??
          field.value.id ??
          null
        if (candidate !== null && candidate !== undefined) {
          const text = String(candidate).trim()
          if (text) return text
        }
      }

      if (staticMatch?.label) {
        return String(staticMatch.label)
      }

      return ''
    })()

    if (!fallbackLabel) {
      setReferenceState((prev) => {
        if (prev.selectedValue === referenceValue) return prev
        return { ...prev, selectedValue: referenceValue }
      })
      return
    }

    setReferenceState((prev) => {
      if (
        prev.selectedValue === referenceValue &&
        prev.selectedLabel === fallbackLabel
      ) {
        return prev
      }
      return {
        ...prev,
        selectedLabel: fallbackLabel,
        selectedValue: referenceValue,
      }
    })
  }, [
    type,
    referenceValue,
    field.value,
    staticReferenceOptions,
  ])

  if (!key) {
    console.warn('⚠️ Field without key/name skipped:', field)
    return null
  }

  const renderHelpText = (showEmptyNotice) => {
    const help = []
    if (field.helpText) {
      help.push(
        <p key="help" className="help-text">
          {field.helpText}
        </p>
      )
    }
    if (showEmptyNotice) {
      help.push(
        <p key="empty" className="help-text warning">
          {field.noOptionsMessage || 'No options available.'}
        </p>
      )
    }
    return help
  }

  if (isReferenceType) {
    const worldId = resolveWorldId()
    const placeholderName =
      typeof referenceTypeName === 'string' && referenceTypeName.trim()
        ? referenceTypeName.trim()
        : 'entities'
    const hasStaticOptions = staticReferenceOptions.length > 0
    const canSearch = Boolean(referenceTypeId && worldId)
    const controlDisabled = !canSearch && !hasStaticOptions

    if (isReadOnly) {
      const displaySource =
        field.displayKey && readValueByPath(data, field.displayKey)
          ? readValueByPath(data, field.displayKey)
          : null

      let displayFallback =
        displaySource ??
        referenceState.selectedLabel ??
        staticReferenceOptions.find((option) => option.value === referenceValue)?.label ??
        ''

      if (!displayFallback && referenceValue) {
        displayFallback = referenceValue
      }

      // Extract entity ID and name from the reference value for the Info icon
      const referenceEntityId = extractReferenceEntityId(rawValue || field.value || referenceValue)
      const referenceEntityName = extractReferenceEntityName(rawValue || field.value) || displayFallback || referenceValue

      return (
        <div className={`form-group ${isReadOnly ? 'readonly' : ''}`}>
          <label>{label}</label>
          <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
            <input
              type="text"
              value={formattedValue(displayFallback)}
              disabled
              className="readonly-control"
              style={{
                paddingRight: referenceEntityId ? '2.5rem' : '0.8rem',
                width: '100%',
              }}
            />
            {referenceEntityId && (
              <div
                style={{
                  position: 'absolute',
                  right: '0.5rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 1,
                }}
              >
                <EntityInfoPreview
                  entityId={referenceEntityId}
                  entityName={referenceEntityName}
                  className="entity-info-trigger--field-button"
                />
              </div>
            )}
          </div>
          {renderHelpText(false)}
        </div>
      )
    }

    const handleReferenceChange = (entity) => {
      if (!entity) {
        onChange?.(key, '')
        setReferenceState((prev) => ({
          ...prev,
          selectedLabel: '',
          selectedValue: null,
        }))
        return
      }

      const rawId =
        entity.id ?? entity.value ?? entity.key ?? entity.slug ?? entity.uuid ?? null

      if (rawId === null || rawId === undefined) {
        onChange?.(key, '')
        return
      }

      const resolvedId = String(rawId)
      const entityLabel =
        entity.name ??
        entity.label ??
        entity.title ??
        entity.display ??
        entity.displayName ??
        ''

      onChange?.(key, resolvedId)
      setReferenceState((prev) => ({
        ...prev,
        selectedLabel: entityLabel || prev.selectedLabel || resolvedId,
        selectedValue: resolvedId,
      }))
    }

    const handleReferenceResolved = (entity) => {
      if (!entity) {
        setReferenceState((prev) => ({
          ...prev,
          selectedLabel: '',
          selectedValue: null,
        }))
        return
      }

      const rawId =
        entity.id ?? entity.value ?? entity.key ?? entity.slug ?? entity.uuid ?? null

      if (rawId === null || rawId === undefined) {
        return
      }

      const resolvedId = String(rawId)
      const entityLabel =
        entity.name ??
        entity.label ??
        entity.title ??
        entity.display ??
        entity.displayName ??
        ''

      setReferenceState((prev) => {
        if (prev.selectedValue === resolvedId && prev.selectedLabel === entityLabel) {
          return prev
        }
        return {
          ...prev,
          selectedLabel: entityLabel || prev.selectedLabel || resolvedId,
          selectedValue: resolvedId,
        }
      })
    }

    const controlValue =
      referenceValue && referenceState.selectedLabel
        ? { id: referenceValue, name: referenceState.selectedLabel }
        : referenceValue

    return (
      <div className="form-group">
        <label>{label}</label>
        <EntitySearchSelect
          worldId={worldId}
          value={controlValue}
          allowedTypeIds={referenceTypeId ? [referenceTypeId] : []}
          disabled={controlDisabled}
          placeholder={`Search ${placeholderName.toLowerCase()}...`}
          staticOptions={staticReferenceOptions}
          onChange={handleReferenceChange}
          onResolved={handleReferenceResolved}
          required={Boolean(field.required)}
        />
        {!referenceTypeId && (
          <p className="help-text warning">Reference type configuration is missing.</p>
        )}
        {referenceTypeId && !worldId && (
          <p className="help-text warning">Select a world to search for entities.</p>
        )}
        {renderHelpText(false)}
      </div>
    )
  }

  // --- SELECT / DROPDOWN ---
  if (['select', 'dropdown'].includes(type)) {
    const opts = [...(field.options || []), ...dynamicOptions]
    const selectValue = normalisedValue ?? ''
    const showEmptyNotice = optionsLoaded && field.optionsSource && opts.length === 0

    if (isReadOnly) {
      const selected = opts.find((opt) => {
        if (!opt) return false
        if (typeof opt === 'object') return String(opt.value) === String(selectValue)
        return String(opt) === String(selectValue)
      })
      const displaySource =
        field.displayKey && readValueByPath(data, field.displayKey)
          ? readValueByPath(data, field.displayKey)
          : null
      const display = displaySource
        ? formattedValue(displaySource)
        : formattedValue(
            selected
              ? (typeof selected === 'object' ? selected.label ?? selected.value : selected)
              : selectValue
          )

      return (
        <div className={`form-group ${isReadOnly ? 'readonly' : ''}`}>
          <label>{label}</label>
          <input type="text" value={display} disabled className="readonly-control" />
          {renderHelpText(false)}
        </div>
      )
    }
    return (
      <div className="form-group">
        <label>{label}</label>
        <div className="select-wrapper">
          <select
            value={selectValue}
            onChange={handleChange}
            disabled={showEmptyNotice}
          >
            <option value="">Select...</option>
            {opts.map((opt, i) => {
              const val = typeof opt === 'object' ? opt.value : opt
              const text = typeof opt === 'object' ? opt.label : opt
              return (
                <option key={val || i} value={val}>
                  {text}
                </option>
              )
            })}
          </select>
        </div>
        {renderHelpText(showEmptyNotice)}
      </div>
    )
  }

  if (type === 'multiselect') {
    const supplementalOptions = [
      ...(Array.isArray(field.selectedOptions) ? field.selectedOptions : []),
      ...(Array.isArray(field.prefillOptions) ? field.prefillOptions : []),
    ]

    const combinedOptions = [...(field.options || []), ...dynamicOptions, ...supplementalOptions]
      .map((option, index) => {
        const normalised = normaliseListCollectorOption(option)
        if (normalised) return normalised

        if (typeof option === 'object' && option !== null) {
          const value =
            option.value ?? option.id ?? option.key ?? option.slug ?? `opt-${index}`
          const label =
            option.label ??
            option.name ??
            option.title ??
            option.username ??
            option.email ??
            value
          if (value === undefined || value === null) return null
          return { value: String(value), label: String(label) }
        }

        if (option === undefined || option === null) return null
        const str = String(option)
        return { value: str, label: str }
      })
      .filter(Boolean)

    const optionMap = new Map()
    const uniqueOptions = combinedOptions.filter((option) => {
      const key = String(option.value)
      if (optionMap.has(key)) return false
      optionMap.set(key, option)
      return true
    })

    const values = Array.isArray(normalisedValue)
      ? normalisedValue.map((val) => String(val)).filter(Boolean)
      : []

    const showEmptyNotice =
      optionsLoaded && field.optionsSource && uniqueOptions.length === 0

    if (isReadOnly) {
      const labels = values
        .map((val) => {
          const option = optionMap.get(String(val))
          if (!option) return String(val)
          return option.label ?? option.value ?? String(val)
        })
        .filter(Boolean)

      return (
        <div className={`form-group ${isReadOnly ? 'readonly' : ''}`}>
          <label>{label}</label>
          <textarea
            className="textarea-field"
            value={labels.length ? labels.join('\n') : '—'}
            readOnly
          />
          {renderHelpText(false)}
        </div>
      )
    }

    return (
      <div className="form-group">
        <label>{label}</label>
        <ListCollector
          selected={values}
          options={uniqueOptions}
          onChange={(selection) => onChange?.(key, selection)}
          placeholder={field.placeholder || 'Search and select...'}
          noOptionsMessage={field.noOptionsMessage || 'No options available.'}
          loading={!optionsLoaded && !!field.optionsSource}
        />
        {renderHelpText(showEmptyNotice)}
      </div>
    )
  }

  // --- TEXTAREA ---
  if (['textarea', 'multiline'].includes(type)) {
    return (
      <div className={`form-group ${isReadOnly ? 'readonly' : ''}`}>
        <label>{label}</label>
        <textarea
          className="textarea-field"
          rows={field.rows || 4}
          value={isReadOnly ? safeValue : normalisedValue}
          onChange={handleChange}
          disabled={isReadOnly}
        />
        {renderHelpText(false)}
      </div>
    )
  }

  // --- CHECKBOX ---
  if (['checkbox', 'boolean'].includes(type)) {
    return (
      <div className="form-group checkbox">
        <label>
          <input
            type="checkbox"
            checked={!!normalisedValue}
            onChange={handleCheck}
            disabled={isReadOnly}
          />
          {label}
        </label>
        {renderHelpText(false)}
      </div>
    )
  }

  // --- READONLY ---
  if (type === 'readonly') {
    const display = normalisedValue?.username || normalisedValue?.name || normalisedValue || '-'
    return (
      <div className="form-group readonly">
        <label>{label}</label>
        <div className="readonly-value">{display}</div>
        {renderHelpText(false)}
      </div>
    )
  }

  // --- DEFAULT TEXT INPUT ---
  const inputType = (isReadOnly ? 'text' : field.inputType) || 'text'

  const sanitisedInputValue = (() => {
    if (normalisedValue === null || normalisedValue === undefined) {
      return ''
    }

    const strictInputTypes = new Set([
      'number',
      'date',
      'datetime-local',
      'month',
      'time',
      'week',
      'range',
    ])

    if (strictInputTypes.has(inputType)) {
      if (typeof normalisedValue === 'string') {
        const trimmed = normalisedValue.trim()
        if (!trimmed || trimmed === '—') {
          return ''
        }
      }
    }

    return normalisedValue
  })()

  if (isReadOnly) {
    return (
      <div className="form-group readonly">
        <label>{label}</label>
        <div className="readonly-value">{safeValue}</div>
        {renderHelpText(false)}
      </div>
    )
  }

  return (
    <div className="form-group">
      <label>{label}</label>
      <input
        type={inputType}
        value={sanitisedInputValue}
        onChange={handleChange}
        placeholder={field.placeholder || ''}
        className={isReadOnly ? 'readonly-control' : undefined}
      />
      {renderHelpText(false)}
    </div>
  )
}
