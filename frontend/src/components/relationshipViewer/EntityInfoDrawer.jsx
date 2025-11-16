import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PropTypes from '../../utils/propTypes.js'
import { buildEntityImageUrl } from '../../utils/entityHelpers.js'
import { sortFieldsByOrder } from '../../utils/fieldLayout.js'
import {
  evaluateFieldRuleActions,
  isFieldHiddenByRules,
  normaliseFieldRules,
} from '../../utils/fieldRuleEngine.js'
import { buildMetadataViewMap, formatDateTimeValue } from '../../utils/metadataFieldUtils.js'
import './EntityInfoDrawer.css'

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

const extractMetadataEntries = (entity, fieldOrder) => {
  if (!entity) return []
  const fieldList = Array.isArray(entity.fields) ? entity.fields : []
  if (fieldList.length > 0) {
    const sortedFields = sortFieldsByOrder(fieldList, fieldOrder)
    return sortedFields
      .filter((field) => field?.name || field?.label)
      .map((field, index) => {
        const key = field.name || field.label || `field-${index}`
        const label = field.label || field.name || `Field ${index + 1}`
        const fieldKey = field?.name ? `metadata.${field.name}` : field?.key || key
        return {
          key,
          label,
          value: formatFieldValue(field),
          fieldKey,
        }
      })
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
    fieldKey: key ? `metadata.${key}` : key,
  }))
}

const buildMetadataRuleValues = (entity) => {
  if (!entity) return {}
  if (Array.isArray(entity.fields) && entity.fields.length > 0) {
    return buildMetadataViewMap(entity.fields)
  }

  const metadataSource =
    (entity.metadata && typeof entity.metadata === 'object' && entity.metadata) ||
    (entity.meta && typeof entity.meta === 'object' && entity.meta) ||
    null
  if (!metadataSource) return {}
  return { ...metadataSource }
}

export default function EntityInfoDrawer({
  entity,
  entityId,
  onClose,
  isLoading = false,
  error = '',
  fallbackName = '',
  fieldOrder = [],
  fieldRules = [],
}) {
  const navigate = useNavigate()
  const [displayedState, setDisplayedState] = useState(() =>
    entityId ? { entity, entityId, isLoading, error, fallbackName } : null,
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
      pendingStateRef.current = { entity, entityId, isLoading, error, fallbackName }
    }

    if (entityId) {
      if (!displayedState) {
        setDisplayedState({ entity, entityId, isLoading, error, fallbackName })
        setAnimationState(PREPARING_OPEN_STATE)
        return
      }

      if (displayedState.entityId === entityId) {
        setDisplayedState((prev) => {
          if (!prev) return prev
          if (
            prev.entity === entity &&
            prev.isLoading === isLoading &&
            prev.error === error &&
            prev.fallbackName === (fallbackName || prev.fallbackName || '')
          ) {
            return prev
          }
          return {
            ...prev,
            entity,
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

      pendingStateRef.current = { entity, entityId, isLoading, error, fallbackName }
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
  }, [entity, entityId, isLoading, error, fallbackName, displayedState, animationState])

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
  const visibleFallbackName = displayedState?.fallbackName

  const normalisedFieldRules = useMemo(
    () => normaliseFieldRules(fieldRules),
    [fieldRules],
  )

  const metadataRuleValues = useMemo(
    () => buildMetadataRuleValues(visibleEntity),
    [visibleEntity],
  )

  const drawerRuleValues = useMemo(
    () => ({ metadata: metadataRuleValues }),
    [metadataRuleValues],
  )

  const viewRuleContext = useMemo(
    () => evaluateFieldRuleActions(normalisedFieldRules, drawerRuleValues),
    [normalisedFieldRules, drawerRuleValues],
  )

  const metadataEntries = useMemo(
    () => extractMetadataEntries(visibleEntity, fieldOrder),
    [visibleEntity, fieldOrder],
  )

  const visibleMetadataEntries = useMemo(() => {
    if (!metadataEntries.length) return []
    const actionsByField = viewRuleContext?.actionsByField ?? {}
    const showRuleTargets = viewRuleContext?.showRuleTargets ?? new Set()
    return metadataEntries.filter((entry) => {
      if (!entry?.fieldKey) return true
      const action = actionsByField[entry.fieldKey]
      return !isFieldHiddenByRules(entry.fieldKey, action, showRuleTargets)
    })
  }, [metadataEntries, viewRuleContext])

  const hasMetadata = visibleMetadataEntries.length > 0
  const entityName =
    visibleEntity?.name ||
    visibleFallbackName ||
    (visibleLoading ? 'Loading entity…' : 'Unknown entity')
  const entityType =
    visibleEntity?.type?.name || visibleEntity?.typeName || 'Entity'
  const entityImageUrl = useMemo(
    () => buildEntityImageUrl(visibleEntity),
    [visibleEntity],
  )

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

        {entityImageUrl && !visibleLoading && !visibleError ? (
          <div className="entity-info-drawer__image">
            <img src={entityImageUrl} alt={`Portrait of ${entityName}`} loading="lazy" />
          </div>
        ) : null}

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
            {visibleMetadataEntries.map((item) => (
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
  fallbackName: PropTypes.string,
  fieldOrder: PropTypes.arrayOf(PropTypes.object),
  fieldRules: PropTypes.arrayOf(PropTypes.object),
}
