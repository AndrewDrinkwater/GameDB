import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Info, X } from 'lucide-react'
import PropTypes from 'prop-types'
import { getEntity } from '../../api/entities.js'

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

const formatMetadataValue = (field) => {
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

const extractMetadata = (entity) => {
  if (!entity) return []
  const fieldList = Array.isArray(entity.fields) ? entity.fields : []
  if (fieldList.length > 0) {
    return fieldList
      .filter((field) => field?.name)
      .map((field) => ({
        key: field.name,
        label: field.label || field.name,
        value: formatMetadataValue(field),
      }))
  }

  const metadata = entity.metadata && typeof entity.metadata === 'object' ? entity.metadata : null
  if (!metadata) return []
  return Object.entries(metadata).map(([key, rawValue]) => ({
    key,
    label: key,
    value: resolvePrimitive(rawValue),
  }))
}

const getTagLabels = (entity) => {
  if (!entity) return []
  const tags = Array.isArray(entity.tags) ? entity.tags : []
  return tags
    .map((tag, index) => {
      if (typeof tag === 'string') return { id: `tag-${index}`, label: tag }
      if (!tag || typeof tag !== 'object') return null
      const label = tag.label || tag.name || tag.title || tag.value
      if (!label) return null
      const id = tag.id || tag.key || `tag-${index}`
      return { id, label }
    })
    .filter(Boolean)
}

export default function EntityInfoPreview({ entityId, entityName = 'entity', className = '' }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [previewEntity, setPreviewEntity] = useState(null)
  const [error, setError] = useState('')
  const closeButtonRef = useRef(null)

  const modalTitleId = useMemo(() => `entity-preview-title-${entityId}`, [entityId])
  const modalSubtitleId = useMemo(() => `entity-preview-subtitle-${entityId}`, [entityId])

  const handleClose = useCallback(() => {
    setOpen(false)
    setError('')
  }, [])

  const handleTriggerClick = (event) => {
    event.preventDefault()
    event.stopPropagation()
    if (!entityId) return
    setOpen(true)
  }

  useEffect(() => {
    if (!open || !entityId) return undefined
    let cancelled = false

    const loadEntity = async () => {
      setLoading(true)
      setError('')
      try {
        const response = await getEntity(entityId)
        if (cancelled) return
        const data = response?.data || response
        if (!data) {
          setPreviewEntity(null)
          setError('Entity not found')
          return
        }
        setPreviewEntity(data)
      } catch (err) {
        if (cancelled) return
        console.error('❌ Failed to load entity preview', err)
        setPreviewEntity(null)
        setError(err.message || 'Failed to load entity information')
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadEntity()

    return () => {
      cancelled = true
    }
  }, [open, entityId])

  useEffect(() => {
    if (!open) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        handleClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, handleClose])

  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => {
      closeButtonRef.current?.focus({ preventScroll: true })
    }, 0)
    return () => window.clearTimeout(timer)
  }, [open])

  const metadataItems = useMemo(() => extractMetadata(previewEntity), [previewEntity])
  const tagItems = useMemo(() => getTagLabels(previewEntity), [previewEntity])

  const createdAtValue = previewEntity?.createdAt || previewEntity?.created_at
  const createdByValue =
    previewEntity?.creator?.username ||
    previewEntity?.creator?.email ||
    previewEntity?.created_by ||
    '—'

  const modal = !open
    ? null
    : createPortal(
        <div
          className="entity-preview-backdrop"
          role="presentation"
          onClick={handleClose}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={modalTitleId}
            aria-describedby={modalSubtitleId}
            className="entity-preview-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="entity-preview-header">
              <div className="entity-preview-heading">
                <h2 id={modalTitleId}>
                  {previewEntity?.name || entityName || 'Entity'}
                </h2>
                <p id={modalSubtitleId} className="entity-preview-subtitle">
                  {previewEntity?.entityType?.name ||
                    previewEntity?.entity_type?.name ||
                    previewEntity?.entityTypeName ||
                    previewEntity?.type ||
                    'Entity'}
                </p>
              </div>
              <button
                type="button"
                className="icon-btn entity-preview-close"
                onClick={handleClose}
                aria-label="Close entity preview"
                ref={closeButtonRef}
              >
                <X size={18} />
              </button>
            </div>

            <div className="entity-preview-body">
              {loading ? (
                <div className="entity-preview-loading" role="status" aria-live="polite">
                  Loading entity information…
                </div>
              ) : error ? (
                <div className="entity-preview-error" role="alert">
                  {error}
                </div>
              ) : previewEntity ? (
                <>
                  <section className="entity-preview-section">
                    <h3>Overview</h3>
                    <div className="entity-preview-description">
                      {previewEntity.description ? (
                        <p>{previewEntity.description}</p>
                      ) : (
                        <p className="entity-preview-empty">No description provided.</p>
                      )}
                    </div>
                    <dl className="entity-preview-definition">
                      <div>
                        <dt>Created</dt>
                        <dd>{formatDateTime(createdAtValue)}</dd>
                      </div>
                      <div>
                        <dt>Created by</dt>
                        <dd>{createdByValue}</dd>
                      </div>
                    </dl>
                  </section>

                  {metadataItems.length > 0 ? (
                    <section className="entity-preview-section">
                      <h3>Metadata</h3>
                      <dl className="entity-preview-definition">
                        {metadataItems.map((item) => (
                          <div key={item.key}>
                            <dt>{item.label}</dt>
                            <dd>{item.value}</dd>
                          </div>
                        ))}
                      </dl>
                    </section>
                  ) : (
                    <section className="entity-preview-section">
                      <h3>Metadata</h3>
                      <p className="entity-preview-empty">No metadata available for this entity.</p>
                    </section>
                  )}

                  {tagItems.length > 0 && (
                    <section className="entity-preview-section">
                      <h3>Tags</h3>
                      <div className="entity-preview-badges">
                        {tagItems.map((tag) => (
                          <span key={tag.id} className="entity-preview-badge">
                            {tag.label}
                          </span>
                        ))}
                      </div>
                    </section>
                  )}
                </>
              ) : (
                <div className="entity-preview-empty">No entity information available.</div>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )

  return (
    <>
      <button
        type="button"
        className={`entity-info-trigger ${className}`.trim()}
        onClick={handleTriggerClick}
        aria-label={`View details for ${entityName}`}
      >
        <Info size={16} aria-hidden="true" />
      </button>
      {modal}
    </>
  )
}

EntityInfoPreview.propTypes = {
  entityId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  entityName: PropTypes.string,
  className: PropTypes.string,
}
