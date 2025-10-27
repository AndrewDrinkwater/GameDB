import ReactDOM from 'react-dom'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'

import './ClusterPopup.css'

const PANEL_WIDTH = 420
const PANEL_MAX_HEIGHT = 520
const VIEWPORT_OFFSET = 16

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const getEntityTypeName = (entity) => entity?.type?.name || entity?.typeName || 'Entity'

export default function ClusterPopup({ position, cluster, onClose, onDragEntity }) {
  const { label, relationshipType, entities = [] } = cluster || {}
  const [draggingId, setDraggingId] = useState(null)
  const [draggingEntity, setDraggingEntity] = useState(null)
  const [dragPreview, setDragPreview] = useState(null)
  const [portalEl, setPortalEl] = useState(null)
  const entityCount = Array.isArray(entities) ? entities.length : 0
  const [currentPos, setCurrentPos] = useState({
    x: position?.x ?? 100,
    y: position?.y ?? 100,
  })
  const panelRef = useRef(null)
  const dragState = useRef(null)
  const dragContainerRectRef = useRef(null)

  const getContainerRect = useCallback(() => {
    const parent = portalEl?.parentElement
    if (parent) {
      const rect = parent.getBoundingClientRect()
      return {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      }
    }

    return {
      left: 0,
      top: 0,
      width: window.innerWidth,
      height: window.innerHeight,
    }
  }, [portalEl])

  const bounds = useMemo(() => {
    const rect = getContainerRect()
    const width = panelRef.current?.offsetWidth ?? PANEL_WIDTH
    const height =
      panelRef.current?.offsetHeight ?? Math.min(rect.height * 0.7, PANEL_MAX_HEIGHT)
    const offset = VIEWPORT_OFFSET

    return {
      minX: offset,
      minY: offset,
      maxX: Math.max(offset, rect.width - width - offset),
      maxY: Math.max(offset, rect.height - height - offset),
      containerRect: rect,
    }
  }, [entityCount, getContainerRect])

  useEffect(() => {
    const target =
      document.querySelector('.react-flow__renderer') ||
      document.querySelector('.react-flow') ||
      document.body

    const el = document.createElement('div')
    el.style.position = target === document.body ? 'fixed' : 'absolute'
    el.style.top = '0'
    el.style.left = '0'
    el.style.right = '0'
    el.style.bottom = '0'
    el.style.zIndex = '2500'
    el.style.pointerEvents = 'none'
    target.appendChild(el)
    setPortalEl(el)

    return () => {
      target.removeChild(el)
    }
  }, [])

  useEffect(() => {
    setCurrentPos({
      x: clamp(position?.x ?? 100, bounds.minX, bounds.maxX),
      y: clamp(position?.y ?? 100, bounds.minY, bounds.maxY),
    })
  }, [bounds.maxX, bounds.maxY, bounds.minX, bounds.minY, position?.x, position?.y])

  const handlePointerMove = useCallback((event) => {
    if (!dragState.current) return

    const { offsetX, offsetY, bounds: dragBounds, containerRect } = dragState.current
    const x = clamp(
      event.clientX - containerRect.left - offsetX,
      dragBounds.minX,
      dragBounds.maxX
    )
    const y = clamp(
      event.clientY - containerRect.top - offsetY,
      dragBounds.minY,
      dragBounds.maxY
    )
    setCurrentPos({ x, y })
  }, [])

  const handlePointerUp = useCallback(() => {
    dragState.current = null
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', handlePointerUp)
    window.removeEventListener('pointercancel', handlePointerUp)
  }, [handlePointerMove])

  const handleDragStartPopup = (event) => {
    if (event.button !== 0) return
    if (event.target.closest('button')) return

    event.preventDefault()
    event.stopPropagation()

    const dragBounds = bounds
    const containerRect = dragBounds.containerRect || getContainerRect()
    const offsetX = event.clientX - containerRect.left - (currentPos?.x ?? dragBounds.minX)
    const offsetY = event.clientY - containerRect.top - (currentPos?.y ?? dragBounds.minY)

    dragState.current = {
      offsetX,
      offsetY,
      bounds: dragBounds,
      containerRect,
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)
  }

  useEffect(() => () => handlePointerUp(), [handlePointerUp])

  const handleClose = useCallback(() => {
    handlePointerUp()
    onClose?.()
  }, [handlePointerUp, onClose])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        handleClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleClose])

  const dragImageRef = useRef(null)

  const ensureDragImage = useCallback(() => {
    if (!dragImageRef.current) {
      const img = new Image()
      img.src =
        'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='
      dragImageRef.current = img
    }
    return dragImageRef.current
  }, [])

  const handleDragStart = (e, entity) => {
    e.dataTransfer.setData('application/x-entity', JSON.stringify(entity))
    if (cluster?.id || cluster?.sourceId || cluster?.relationshipType) {
      e.dataTransfer.setData(
        'application/x-cluster-context',
        JSON.stringify({
          clusterId: cluster?.id ?? null,
          sourceId: cluster?.sourceId ?? null,
          relationshipType: cluster?.relationshipType ?? null,
        })
      )
    }
    e.dataTransfer.effectAllowed = 'copyMove'
    const dragImage = ensureDragImage()
    if (dragImage) {
      try {
        e.dataTransfer.setDragImage(dragImage, 0, 0)
      } catch (err) {
        // ignore if drag image cannot be set
      }
    }
    setDraggingId(entity.id)
    setDraggingEntity(entity)
    const containerRect = getContainerRect()
    dragContainerRectRef.current = containerRect
    setDragPreview({
      x: e.clientX - containerRect.left,
      y: e.clientY - containerRect.top,
    })
  }

  const handleDragEnd = (e, entity) => {
    e.stopPropagation()
    setDraggingId(null)
    setDraggingEntity(null)
    setDragPreview(null)
    dragContainerRectRef.current = null
    if (e.dataTransfer.dropEffect !== 'none') {
      onDragEntity?.('remove', entity)
    }
  }

  const updateDragPreview = useCallback(
    (event) => {
      if (!draggingEntity) return
      const containerRect =
        dragContainerRectRef.current || getContainerRect()
      setDragPreview({
        x: event.clientX - containerRect.left,
        y: event.clientY - containerRect.top,
      })
    },
    [draggingEntity, getContainerRect]
  )

  useEffect(() => {
    if (!draggingEntity) return
    const handleDrag = (event) => updateDragPreview(event)
    window.addEventListener('dragover', handleDrag)
    window.addEventListener('drag', handleDrag)
    return () => {
      window.removeEventListener('dragover', handleDrag)
      window.removeEventListener('drag', handleDrag)
    }
  }, [draggingEntity, updateDragPreview])

  if (!portalEl) return null

  return ReactDOM.createPortal(
    <div className="cluster-popup-overlay">
      <div
        ref={panelRef}
        className="cluster-popup-panel"
        style={{
          top: `${currentPos?.y ?? 100}px`,
          left: `${currentPos?.x ?? 100}px`,
        }}
      >
        <div className="cluster-popup-header" onPointerDown={handleDragStartPopup}>
          <div className="cluster-popup-title">
            <div className="cluster-popup-relationship">{relationshipType || 'Cluster'}</div>
            <div className="cluster-popup-label">{label || 'Entities'}</div>
          </div>
          <button onClick={handleClose} className="cluster-popup-close" aria-label="Close cluster">
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <div className="cluster-popup-instructions">
          Drag a card onto the board to place it; drop back here to re-cluster.
        </div>

        <div className="cluster-popup-entities">
          {entities.length ? (
            entities.map((entity) => (
              <div
                key={entity.id}
                draggable={true}
                onDragStart={(e) => handleDragStart(e, entity)}
                onDragEnd={(e) => handleDragEnd(e, entity)}
                className={`cluster-popup-entity ${draggingId === entity.id ? 'is-dragging' : ''}`}
                title={entity.name || `Entity ${entity.id}`}
              >
                <div className="cluster-popup-entity-name">{entity.name || `Entity ${entity.id}`}</div>
                <div className="cluster-popup-entity-meta">Type: {getEntityTypeName(entity)}</div>
              </div>
            ))
          ) : (
            <div className="cluster-popup-empty">No entities in this cluster.</div>
          )}
        </div>
      </div>
      {draggingEntity && dragPreview && (
        <div
          className="cluster-popup-drag-preview"
          style={{
            transform: `translate(calc(${dragPreview.x}px - 50%), calc(${dragPreview.y}px - 50%))`,
          }}
        >
          <div className="cluster-popup-entity cluster-popup-entity--preview">
            <div className="cluster-popup-entity-name">
              {draggingEntity.name || `Entity ${draggingEntity.id}`}
            </div>
            <div className="cluster-popup-entity-meta">
              Type: {getEntityTypeName(draggingEntity)}
            </div>
          </div>
        </div>
      )}
    </div>,
    portalEl
  )
}
