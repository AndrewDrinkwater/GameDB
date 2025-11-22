import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PropTypes from '../../utils/propTypes.js'
import { formatDateTimeValue } from '../../utils/metadataFieldUtils.js'
import './LocationInfoDrawer.css'

const ANIMATION_DURATION = 450
const PREPARING_OPEN_STATE = 'preparing-open'

const resolvePrimitive = (value) => {
  if (value === null || value === undefined) return '—'
  if (Array.isArray(value)) {
    const joined = value
      .map((item) => {
        if (item === null || item === undefined) return null
        if (typeof item === 'object') {
          return (
            item.label ||
            item.name ||
            item.title ||
            item.value ||
            item.id ||
            null
          )
        }
        return String(item)
      })
      .filter(Boolean)
    return joined.length > 0 ? joined.join(', ') : '—'
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2)
    } catch (err) {
      console.warn('⚠️ Failed to serialise metadata value', err)
      return String(value)
    }
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }
  return value === '' ? '—' : String(value)
}

const resolveReferenceLabel = (value) => {
  if (!value || typeof value !== 'object') return null
  const label =
    value.displayValue ??
    value.label ??
    value.name ??
    value.title ??
    value.display ??
    value.displayName ??
    value.text ??
    value.value ??
    value.id

  return label === undefined || label === null ? null : String(label)
}

const formatFieldValue = (field) => {
  if (!field) return '—'
  const { dataType, data_type, value } = field
  const dataTypeValue = dataType || data_type
  if (value === null || value === undefined) {
    if (dataTypeValue === 'boolean') return 'No'
    return '—'
  }

  switch (dataTypeValue) {
    case 'boolean':
      return value ? 'Yes' : 'No'
    case 'number': {
      const num = Number(value)
      return Number.isNaN(num) ? String(value) : String(num)
    }
    case 'enum':
      if (typeof value === 'object' && value !== null) {
        return (
          value.label ||
          value.name ||
          value.title ||
          value.value ||
          value.id ||
          '—'
        )
      }
      return String(value)
    case 'entity_reference':
    case 'location_reference':
    case 'reference': {
      if (Array.isArray(value)) {
        const labels = value
          .map((item) => {
            if (item === null || item === undefined) return null
            if (typeof item === 'object') {
              const label = resolveReferenceLabel(item)
              return label || null
            }
            return String(item)
          })
          .filter(Boolean)
        if (labels.length > 0) {
          return labels.join(', ')
        }
        const displayFallback =
          field.displayValue ||
          field.display ||
          field.selectedLabel ||
          field.referenceName ||
          field.referenceLabel
        if (displayFallback) {
          return String(displayFallback)
        }
        return '—'
      }

      if (typeof value === 'object' && value !== null) {
        const label = resolveReferenceLabel(value)
        if (label) return label
        try {
          return JSON.stringify(value, null, 2)
        } catch (err) {
          console.warn('⚠️ Failed to serialise reference metadata value', err)
          return String(value)
        }
      }

      if (value === '') return '—'

      if (field.displayValue || field.display || field.selectedLabel) {
        const fallback =
          field.displayValue || field.display || field.selectedLabel
        return fallback ? String(fallback) : '—'
      }

      return String(value)
    }
    case 'date':
      return formatDateTimeValue(value)
    case 'text':
    default:
      return resolvePrimitive(value)
  }
}

const extractMetadataEntries = (location, locationFields = []) => {
  if (!location) return []
  
  if (Array.isArray(locationFields) && locationFields.length > 0) {
    return locationFields
      .filter((field) => field?.name || field?.label)
      .map((field, index) => {
        const key = field.name || field.label || `field-${index}`
        const label = field.label || field.name || `Field ${index + 1}`
        const metadataValue = location.metadata?.[field.name]
        const fieldWithValue = {
          ...field,
          value: metadataValue,
        }
        return {
          key,
          label,
          value: formatFieldValue(fieldWithValue),
          fieldKey: field?.name ? `metadata.${field.name}` : key,
          visibleByDefault: field.visible_by_default !== undefined ? Boolean(field.visible_by_default) : true,
        }
      })
  }

  const metadataSource =
    (location.metadata && typeof location.metadata === 'object' && location.metadata) ||
    (location.meta && typeof location.meta === 'object' && location.meta) ||
    null

  if (!metadataSource) return []

  return Object.entries(metadataSource).map(([key, rawValue]) => ({
    key,
    label: key,
    value: resolvePrimitive(rawValue),
    fieldKey: key ? `metadata.${key}` : key,
    visibleByDefault: true,
  }))
}

export default function LocationInfoDrawer({
  location,
  locationId,
  onClose,
  isLoading = false,
  error = '',
  fallbackName = '',
  locationFields = [],
}) {
  const navigate = useNavigate()
  const [displayedState, setDisplayedState] = useState(() =>
    locationId ? { location, locationId, isLoading, error, fallbackName } : null,
  )
  const [animationState, setAnimationState] = useState(locationId ? 'open' : 'closed')
  const pendingStateRef = useRef(null)
  const closeTimerRef = useRef(null)

  useEffect(() => () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (locationId && pendingStateRef.current?.locationId === locationId) {
      pendingStateRef.current = { location, locationId, isLoading, error, fallbackName }
    }

    if (locationId) {
      if (!displayedState) {
        setDisplayedState({ location, locationId, isLoading, error, fallbackName })
        setAnimationState(PREPARING_OPEN_STATE)
        return
      }

      if (displayedState.locationId === locationId) {
        setDisplayedState((prev) => {
          if (!prev) return prev
          if (
            prev.location === location &&
            prev.isLoading === isLoading &&
            prev.error === error &&
            prev.fallbackName === (fallbackName || prev.fallbackName || '')
          ) {
            return prev
          }
          return {
            ...prev,
            location,
            isLoading,
            error,
            fallbackName: fallbackName || prev.fallbackName || '',
          }
        })
        if (animationState === 'closing' && closeTimerRef.current) {
          clearTimeout(closeTimerRef.current)
          closeTimerRef.current = null
          pendingStateRef.current = null
          setAnimationState('opening')
        } else if (animationState === 'closed') {
          setAnimationState(PREPARING_OPEN_STATE)
        }
        return
      }

      pendingStateRef.current = { location, locationId, isLoading, error, fallbackName }
      if (animationState !== 'closing') {
        setAnimationState('closing')
      }
      if (!closeTimerRef.current) {
        closeTimerRef.current = setTimeout(() => {
          setDisplayedState(pendingStateRef.current)
          pendingStateRef.current = null
          setAnimationState('opening')
          closeTimerRef.current = null
        }, ANIMATION_DURATION)
      }
      return
    }

    if (displayedState) {
      if (animationState !== 'closing') {
        setAnimationState('closing')
      }
      if (!closeTimerRef.current) {
        pendingStateRef.current = null
        closeTimerRef.current = setTimeout(() => {
          setDisplayedState(null)
          setAnimationState('closed')
          closeTimerRef.current = null
        }, ANIMATION_DURATION)
      }
    }
  }, [location, locationId, isLoading, error, fallbackName, displayedState, animationState])

  useEffect(() => {
    if (animationState !== PREPARING_OPEN_STATE) {
      return undefined
    }

    const raf = requestAnimationFrame(() => {
      setAnimationState('opening')
    })

    return () => cancelAnimationFrame(raf)
  }, [animationState])

  useEffect(() => {
    if (animationState !== 'opening') {
      return undefined
    }

    const raf = requestAnimationFrame(() => {
      setAnimationState('open')
    })

    return () => cancelAnimationFrame(raf)
  }, [animationState])

  const isRendered = Boolean(displayedState)
  const isClosing = animationState === 'closing'

  const visibleLocation = displayedState?.location
  const visibleLocationId = displayedState?.locationId
  const visibleLoading = displayedState?.isLoading ?? false
  const visibleError = displayedState?.error ?? ''
  const visibleFallbackName = displayedState?.fallbackName

  const metadataEntries = useMemo(
    () => extractMetadataEntries(visibleLocation, locationFields),
    [visibleLocation, locationFields],
  )

  const hasMetadata = metadataEntries.length > 0
  const locationName =
    visibleLocation?.name ||
    visibleFallbackName ||
    (visibleLoading ? 'Loading location…' : 'Unknown location')
  const locationType =
    visibleLocation?.locationType?.name || visibleLocation?.locationTypeName || 'Location'

  if (!isRendered) {
    return null
  }

  const isOpening = animationState === 'opening'

  const wrapperClassName = [
    'location-info-drawer-wrapper',
    animationState === 'open' ? 'location-info-drawer-wrapper--open' : '',
    isOpening ? 'location-info-drawer-wrapper--opening' : '',
    isClosing ? 'location-info-drawer-wrapper--closing' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const handleNavigateToRecord = () => {
    if (!visibleLocationId) return
    navigate(`/locations/${visibleLocationId}`)
  }

  const canNavigate = Boolean(visibleLocationId) && !visibleLoading && !visibleError

  return (
    <div className={wrapperClassName} role="presentation">
      <div
        className="location-info-drawer__overlay"
        onClick={onClose}
        role="presentation"
      />
      <aside
        className="location-info-drawer"
        role="complementary"
        aria-label="Location details"
      >
        <header className="location-info-drawer__header">
          <div className="location-info-drawer__header-top">
            <p className="location-info-drawer__type" title={locationType}>
              {locationType}
            </p>
            <div className="location-info-drawer__actions">
              <button
                type="button"
                className="location-info-drawer__link"
                onClick={handleNavigateToRecord}
                disabled={!canNavigate}
              >
                Go to Record
              </button>
              <button
                type="button"
                className="location-info-drawer__close"
                onClick={onClose}
                aria-label="Close location details"
              >
                ×
              </button>
            </div>
          </div>
          <h2 className="location-info-drawer__title" title={locationName}>
            {locationName}
          </h2>
        </header>

        {visibleLocation?.description && !visibleLoading && !visibleError && (
          <p className="location-info-drawer__summary">{visibleLocation.description}</p>
        )}

        {visibleLocation?.parent && !visibleLoading && !visibleError && (
          <div className="location-info-drawer__parent">
            <span className="location-info-drawer__parent-label">Parent:</span>
            <span className="location-info-drawer__parent-name">{visibleLocation.parent.name}</span>
          </div>
        )}

        {visibleLoading && (
          <p className="location-info-drawer__status" aria-live="polite">
            Loading location information…
          </p>
        )}

        {!!visibleError && !visibleLoading && (
          <p className="location-info-drawer__status location-info-drawer__status--error" aria-live="assertive">
            {visibleError}
          </p>
        )}

        {!visibleLoading && !visibleError && hasMetadata && (
          <dl className="location-info-drawer__metadata">
            {metadataEntries.map((item) => (
              <div key={item.key} className="location-info-drawer__metadata-item">
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {!visibleLoading && !visibleError && !hasMetadata && (
          <p className="location-info-drawer__status">No additional metadata available.</p>
        )}
      </aside>
    </div>
  )
}

LocationInfoDrawer.propTypes = {
  locationId: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
  error: PropTypes.string,
  fallbackName: PropTypes.string,
  locationFields: PropTypes.arrayOf(PropTypes.object),
}

