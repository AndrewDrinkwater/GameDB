import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PropTypes from '../../utils/propTypes.js'
import './EntityInfoDrawer.css'

const ANIMATION_DURATION = 450
const PREPARING_OPEN_STATE = 'preparing-open'

const formatDateTime = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return typeof value === 'string' ? value : String(value)
  }
  return date.toLocaleString()
}

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

const formatFieldValue = (field) => {
  if (!field) return '—'
  const { dataType, value } = field
  if (value === null || value === undefined) {
    if (dataType === 'boolean') return 'No'
    return '—'
  }

  switch (dataType) {
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
    case 'date':
      return formatDateTime(value)
    case 'text':
    default:
      return resolvePrimitive(value)
  }
}

const extractMetadataEntries = (entity) => {
  if (!entity) return []
  const fieldList = Array.isArray(entity.fields) ? entity.fields : []
  if (fieldList.length > 0) {
    return fieldList
      .filter((field) => field?.name || field?.label)
      .map((field) => ({
        key: field.name || field.label,
        label: field.label || field.name,
        value: formatFieldValue(field),
      }))
  }

  const metadataSource =
    (entity.metadata && typeof entity.metadata === 'object' && entity.metadata) ||
    (entity.meta && typeof entity.meta === 'object' && entity.meta) ||
    null

  if (!metadataSource) return []

  return Object.entries(metadataSource).map(([key, rawValue]) => ({
    key,
    label: key,
    value: resolvePrimitive(rawValue),
  }))
}

export default function EntityInfoDrawer({
  entity,
  entityId,
  onClose,
  isLoading = false,
  error = '',
}) {
  const navigate = useNavigate()
  const [displayedState, setDisplayedState] = useState(() =>
    entityId ? { entity, entityId, isLoading, error } : null,
  )
  const [animationState, setAnimationState] = useState(entityId ? 'open' : 'closed')
  const pendingStateRef = useRef(null)
  const closeTimerRef = useRef(null)

  useEffect(() => () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (entityId && pendingStateRef.current?.entityId === entityId) {
      pendingStateRef.current = { entity, entityId, isLoading, error }
    }

    if (entityId) {
      if (!displayedState) {
        setDisplayedState({ entity, entityId, isLoading, error })
        setAnimationState(PREPARING_OPEN_STATE)
        return
      }

      if (displayedState.entityId === entityId) {
        setDisplayedState((prev) => {
          if (!prev) return prev
          if (
            prev.entity === entity &&
            prev.isLoading === isLoading &&
            prev.error === error
          ) {
            return prev
          }
          return { ...prev, entity, isLoading, error }
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

      pendingStateRef.current = { entity, entityId, isLoading, error }
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
  }, [entity, entityId, isLoading, error, displayedState, animationState])

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

  const visibleEntity = displayedState?.entity
  const visibleEntityId = displayedState?.entityId
  const visibleLoading = displayedState?.isLoading ?? false
  const visibleError = displayedState?.error ?? ''

  const metadataEntries = useMemo(
    () => extractMetadataEntries(visibleEntity),
    [visibleEntity],
  )
  const hasMetadata = metadataEntries.length > 0
  const entityName =
    visibleEntity?.name || (visibleLoading ? 'Loading entity…' : 'Unknown entity')
  const entityType =
    visibleEntity?.type?.name || visibleEntity?.typeName || 'Entity'

  if (!isRendered) {
    return null
  }

  const isOpening = animationState === 'opening'

  const wrapperClassName = [
    'entity-info-drawer-wrapper',
    animationState === 'open' ? 'entity-info-drawer-wrapper--open' : '',
    isOpening ? 'entity-info-drawer-wrapper--opening' : '',
    isClosing ? 'entity-info-drawer-wrapper--closing' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const handleNavigateToRecord = () => {
    if (!visibleEntityId) return
    navigate(`/entities/${visibleEntityId}`)
  }

  const canNavigate = Boolean(visibleEntityId) && !visibleLoading && !visibleError

  return (
    <div className={wrapperClassName} role="presentation">
      <div
        className="entity-info-drawer__overlay"
        onClick={onClose}
        role="presentation"
      />
      <aside
        className="entity-info-drawer"
        role="complementary"
        aria-label="Entity details"
      >
        <header className="entity-info-drawer__header">
          <div className="entity-info-drawer__header-top">
            <p className="entity-info-drawer__type" title={entityType}>
              {entityType}
            </p>
            <div className="entity-info-drawer__actions">
              <button
                type="button"
                className="entity-info-drawer__link"
                onClick={handleNavigateToRecord}
                disabled={!canNavigate}
              >
                Go to Record
              </button>
              <button
                type="button"
                className="entity-info-drawer__close"
                onClick={onClose}
                aria-label="Close entity details"
              >
                ×
              </button>
            </div>
          </div>
          <h2 className="entity-info-drawer__title" title={entityName}>
            {entityName}
          </h2>
        </header>

        {visibleEntity?.summary && !visibleLoading && !visibleError && (
          <p className="entity-info-drawer__summary">{visibleEntity.summary}</p>
        )}
        {!visibleEntity?.summary &&
          visibleEntity?.description &&
          !visibleLoading &&
          !visibleError && (
          <p className="entity-info-drawer__summary">{visibleEntity.description}</p>
        )}

        {visibleLoading && (
          <p className="entity-info-drawer__status" aria-live="polite">
            Loading entity information…
          </p>
        )}

        {!!visibleError && !visibleLoading && (
          <p className="entity-info-drawer__status entity-info-drawer__status--error" aria-live="assertive">
            {visibleError}
          </p>
        )}

        {!visibleLoading && !visibleError && hasMetadata && (
          <dl className="entity-info-drawer__metadata">
            {metadataEntries.map((item) => (
              <div key={item.key} className="entity-info-drawer__metadata-item">
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {!visibleLoading && !visibleError && !hasMetadata && (
          <p className="entity-info-drawer__status">No additional metadata available.</p>
        )}
      </aside>
    </div>
  )
}

EntityInfoDrawer.propTypes = {
  entityId: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
  error: PropTypes.string,
}
