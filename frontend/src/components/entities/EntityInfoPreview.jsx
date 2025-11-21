import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Info } from 'lucide-react'
import PropTypes from '../../utils/propTypes.js'
import { getEntity } from '../../api/entities.js'
import { getEntityTypeFieldOrder, getEntityTypeFieldRules } from '../../api/entityTypes.js'
import { resolveEntityResponse } from '../../utils/entityHelpers.js'
import { extractListResponse } from '../../utils/apiUtils.js'
import EntityInfoDrawer from '../relationshipViewer/EntityInfoDrawer.jsx'

export default function EntityInfoPreview({ entityId, entityName = 'entity', className = '' }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [previewEntity, setPreviewEntity] = useState(null)
  const [error, setError] = useState('')
  const [fieldOrder, setFieldOrder] = useState([])
  const [fieldRules, setFieldRules] = useState([])
  const portalContainerRef = useRef(null)
  const drawerEntityId = useMemo(() => {
    if (entityId === null || entityId === undefined) return null
    return String(entityId)
  }, [entityId])

  // Create portal container for drawer to ensure it's positioned relative to viewport
  useEffect(() => {
    if (!portalContainerRef.current) {
      portalContainerRef.current = document.createElement('div')
      document.body.appendChild(portalContainerRef.current)
    }
    return () => {
      if (portalContainerRef.current && portalContainerRef.current.parentNode) {
        portalContainerRef.current.parentNode.removeChild(portalContainerRef.current)
        portalContainerRef.current = null
      }
    }
  }, [])

  const handleClose = useCallback(() => {
    setOpen(false)
    setError('')
    setPreviewEntity(null)
    setLoading(false)
  }, [])

  const handleTriggerClick = (event) => {
    event.preventDefault()
    event.stopPropagation()
    if (entityId === null || entityId === undefined) return
    const fallbackLabel = typeof entityName === 'string' ? entityName.trim() : ''
    if (drawerEntityId && fallbackLabel) {
      setPreviewEntity((prev) => {
        if (prev && prev.id === drawerEntityId) {
          if (prev.name || !fallbackLabel) {
            return prev
          }
          return { ...prev, name: fallbackLabel }
        }
        return { id: drawerEntityId, name: fallbackLabel }
      })
    }
    setOpen(true)
  }

  useEffect(() => {
    if (!drawerEntityId) return
    const fallbackLabel = typeof entityName === 'string' ? entityName.trim() : ''
    if (!fallbackLabel) return
    setPreviewEntity((prev) => {
      if (!prev) return prev
      if (prev.id !== drawerEntityId) return prev
      if (prev.name === fallbackLabel) return prev
      if (prev.name && prev.name !== fallbackLabel) return prev
      return { ...prev, name: fallbackLabel }
    })
  }, [drawerEntityId, entityName])

  useEffect(() => {
    if (!open || !drawerEntityId) return undefined
    let cancelled = false

    const loadEntity = async () => {
      setLoading(true)
      setError('')
      try {
        const response = await getEntity(drawerEntityId)
        if (cancelled) return
        const data = resolveEntityResponse(response)
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
  }, [open, drawerEntityId])

  const previewEntityTypeId = useMemo(() => {
    if (!previewEntity) return null
    return (
      previewEntity.entity_type_id ||
      previewEntity.entityType?.id ||
      previewEntity.entity_type?.id ||
      null
    )
  }, [previewEntity])

  useEffect(() => {
    if (!previewEntityTypeId) {
      setFieldOrder([])
      setFieldRules([])
      return undefined
    }

    if (!open) {
      return undefined
    }

    let cancelled = false

    const loadFieldLayout = async () => {
      try {
        const [orderResponse, rulesResponse] = await Promise.all([
          getEntityTypeFieldOrder(previewEntityTypeId).catch((err) => {
            console.error('⚠️ Failed to load preview field order', err)
            return null
          }),
          getEntityTypeFieldRules(previewEntityTypeId).catch((err) => {
            console.error('⚠️ Failed to load preview field rules', err)
            return null
          }),
        ])

        if (cancelled) return

        setFieldOrder(extractListResponse(orderResponse))
        setFieldRules(extractListResponse(rulesResponse))
      } catch (err) {
        if (cancelled) return
        console.error('❌ Failed to load preview field layout', err)
        setFieldOrder([])
        setFieldRules([])
      }
    }

    loadFieldLayout()

    return () => {
      cancelled = true
    }
  }, [open, previewEntityTypeId])

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

  const drawerContent = open && portalContainerRef.current ? (
    <EntityInfoDrawer
      entityId={drawerEntityId}
      entity={previewEntity}
      isLoading={loading}
      error={error}
      fallbackName={entityName}
      onClose={handleClose}
      fieldOrder={fieldOrder}
      fieldRules={fieldRules}
    />
  ) : null

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
      {portalContainerRef.current && createPortal(drawerContent, portalContainerRef.current)}
    </>
  )
}

EntityInfoPreview.propTypes = {
  entityId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  entityName: PropTypes.string,
  className: PropTypes.string,
}
