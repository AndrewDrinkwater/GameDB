import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import PropTypes from '../../utils/propTypes.js'
import './EntityInfoDrawer.css'

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
  const isOpen = Boolean(entityId)
  const metadataEntries = useMemo(() => extractMetadataEntries(entity), [entity])
  const hasMetadata = metadataEntries.length > 0
  const entityName = entity?.name || (isLoading ? 'Loading entity…' : 'Unknown entity')
  const entityType = entity?.type?.name || entity?.typeName || 'Entity'

  if (!isOpen) {
    return null
  }

  const handleNavigateToRecord = () => {
    if (!entityId) return
    navigate(`/entities/${entityId}`)
  }

  return (
    <aside className="entity-info-drawer" role="complementary" aria-label="Entity details">
      <button
        type="button"
        className="entity-info-drawer__close"
        onClick={onClose}
        aria-label="Close entity details"
      >
        ×
      </button>

      <header className="entity-info-drawer__header">
        <p className="entity-info-drawer__type" title={entityType}>
          {entityType}
        </p>
        <h2 className="entity-info-drawer__title" title={entityName}>
          {entityName}
        </h2>
      </header>

      {entity?.summary && !isLoading && !error && (
        <p className="entity-info-drawer__summary">{entity.summary}</p>
      )}
      {!entity?.summary && entity?.description && !isLoading && !error && (
        <p className="entity-info-drawer__summary">{entity.description}</p>
      )}

      {isLoading && (
        <p className="entity-info-drawer__status" aria-live="polite">
          Loading entity information…
        </p>
      )}

      {!!error && !isLoading && (
        <p className="entity-info-drawer__status entity-info-drawer__status--error" aria-live="assertive">
          {error}
        </p>
      )}

      {!isLoading && !error && hasMetadata && (
        <dl className="entity-info-drawer__metadata">
          {metadataEntries.map((item) => (
            <div key={item.key} className="entity-info-drawer__metadata-item">
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {!isLoading && !error && !hasMetadata && (
        <p className="entity-info-drawer__status">No additional metadata available.</p>
      )}

      <div className="entity-info-drawer__actions">
        <button
          type="button"
          className="entity-info-drawer__link"
          onClick={handleNavigateToRecord}
        >
          View Full Record
        </button>
      </div>
    </aside>
  )
}

EntityInfoDrawer.propTypes = {
  entityId: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
  error: PropTypes.string,
}
