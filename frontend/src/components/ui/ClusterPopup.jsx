import ReactDOM from 'react-dom'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Eye, Plus, RotateCcw, Target } from 'lucide-react'
import './ClusterPopup.css'

const PANEL_WIDTH = 420
const PANEL_MAX_HEIGHT = 520
const VIEWPORT_OFFSET = 16

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)
const getEntityTypeName = (entity) => entity?.type?.name || entity?.typeName || 'Entity'

export default function ClusterPopup({
  position,
  cluster,
  onClose,
  onAddToBoard,
  onReturnToGroup,
  onSetTargetEntity,
  onOpenEntityInfo,
  releasedEntityIds = [],
}) {
  const {
    label,
    relationshipType,
    entities = [],
    placedEntityIds = [],
    sourceId,
  } = cluster || {}
  const [portalEl, setPortalEl] = useState(null)
  const [selectedEntityId, setSelectedEntityId] = useState(null)
  const [currentPos, setCurrentPos] = useState({
    x: position?.x ?? 100,
    y: position?.y ?? 100,
  })

  const panelRef = useRef(null)
  const dragState = useRef(null)

  // --- container bounds ---------------------------------------------------
  const getContainerRect = useCallback(() => {
    const parent = portalEl?.parentElement
    if (parent) {
      const rect = parent.getBoundingClientRect()
      return { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
    }
    return { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight }
  }, [portalEl])

  const bounds = useMemo(() => {
    const rect = getContainerRect()
    const width = panelRef.current?.offsetWidth ?? PANEL_WIDTH
    const height = panelRef.current?.offsetHeight ?? Math.min(rect.height * 0.7, PANEL_MAX_HEIGHT)
    const offset = VIEWPORT_OFFSET
    return {
      minX: offset,
      minY: offset,
      maxX: Math.max(offset, rect.width - width - offset),
      maxY: Math.max(offset, rect.height - height - offset),
      containerRect: rect,
    }
  }, [entityCount, getContainerRect])

  // --- mount portal ------------------------------------------------------
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
    // Allow the popup panel to receive pointer events while
    // still letting clicks fall through the transparent overlay.
    // The overlay itself handles pointer-events via CSS.
    el.style.pointerEvents = 'auto'
    target.appendChild(el)
    setPortalEl(el)
    return () => target.removeChild(el)
  }, [])

  useEffect(() => {
    setCurrentPos({
      x: clamp(position?.x ?? 100, bounds.minX, bounds.maxX),
      y: clamp(position?.y ?? 100, bounds.minY, bounds.maxY),
    })
  }, [bounds, position?.x, position?.y])

  // --- panel drag move ----------------------------------------------------
  const handlePointerMove = useCallback((event) => {
    if (!dragState.current) return
    const { offsetX, offsetY, bounds: dragBounds, containerRect } = dragState.current
    const x = clamp(event.clientX - containerRect.left - offsetX, dragBounds.minX, dragBounds.maxX)
    const y = clamp(event.clientY - containerRect.top - offsetY, dragBounds.minY, dragBounds.maxY)
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
    if (event.target.closest('.cluster-popup-entity')) return // avoid moving the popup while interacting with a card

    event.preventDefault()
    event.stopPropagation()

    const dragBounds = bounds
    const containerRect = dragBounds.containerRect || getContainerRect()
    const offsetX = event.clientX - containerRect.left - (currentPos?.x ?? dragBounds.minX)
    const offsetY = event.clientY - containerRect.top - (currentPos?.y ?? dragBounds.minY)

    dragState.current = { offsetX, offsetY, bounds: dragBounds, containerRect }
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)
  }

  useEffect(() => () => handlePointerUp(), [handlePointerUp])

  // --- close --------------------------------------------------------------
  const handleClose = useCallback(() => {
    handlePointerUp()
    onClose?.()
  }, [handlePointerUp, onClose])

  useEffect(() => {
    const handleKeyDown = (event) => event.key === 'Escape' && handleClose()
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleClose])

  const placedIds = useMemo(
    () => new Set((Array.isArray(placedEntityIds) ? placedEntityIds : []).map(String)),
    [placedEntityIds]
  )
  const releasedIds = useMemo(
    () =>
      new Set((Array.isArray(releasedEntityIds) ? releasedEntityIds : []).map(String)),
    [releasedEntityIds]
  )
  const visibleEntities = useMemo(
    () =>
      Array.isArray(entities)
        ? entities.filter((entity) => !releasedIds.has(String(entity.id)))
        : [],
    [entities, releasedIds]
  )
  const entityCount = visibleEntities.length

  useEffect(() => {
    setSelectedEntityId(null)
  }, [cluster?.id])

  const handleSelectEntity = useCallback(
    (entityId, isPlaced) => {
      if (isPlaced) return
      setSelectedEntityId((current) => (current === entityId ? null : entityId))
    },
    []
  )

  const handleAddEntity = useCallback(
    (entityId) => {
      if (!entityId) return
      if (releasedIds.has(String(entityId))) return
      onAddToBoard?.(cluster, entityId)
      setSelectedEntityId(null)
    },
    [cluster, onAddToBoard, releasedIds]
  )

  const handleReturnEntity = useCallback(
    (entity) => {
      if (!entity) return
      onReturnToGroup?.(cluster, entity)
      setSelectedEntityId(null)
    },
    [cluster, onReturnToGroup]
  )

  // --- render -------------------------------------------------------------
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
          Use the action icons to set a relationship target, open entity details, or add and
          manage entities on the board.
        </div>

        <div className="cluster-popup-entities">
          {visibleEntities.length ? (
            visibleEntities.map((entity) => {
                const entityKey = String(entity.id)
                const isPlaced = placedIds.has(entityKey) || releasedIds.has(entityKey)
                const isSelected = selectedEntityId === entityKey
                const isCurrentSource = sourceId != null && entityKey === String(sourceId)

                return (
                <div
                  key={entity.id}
                  className={`cluster-popup-entity ${isPlaced ? 'is-placed' : ''} ${
                    isSelected ? 'is-selected' : ''
                  }`}
                  title={entity.name || `Entity ${entity.id}`}
                  onClick={() => handleSelectEntity(entityKey, isPlaced)}
                >
                  <div className="cluster-popup-entity-header">
                    <div className="cluster-popup-entity-name">
                      {entity.name || `Entity ${entity.id}`}
                    </div>
                  </div>
                  <div className="cluster-popup-entity-meta" title={getEntityTypeName(entity)}>
                    {getEntityTypeName(entity)}
                  </div>
                  <div className="cluster-popup-entity-actions" role="group" aria-label="Entity actions">
                    {!isPlaced ? (
                      <button
                        type="button"
                        className="cluster-popup-entity-action is-primary"
                        onClick={(event) => {
                          event.stopPropagation()
                          handleAddEntity(entityKey)
                        }}
                        onPointerDown={(event) => event.stopPropagation()}
                        aria-label="Add entity to board"
                        title="Add to board"
                        disabled={!onAddToBoard}
                      >
                        <Plus size={16} aria-hidden="true" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="cluster-popup-entity-action"
                        onClick={(event) => {
                          event.stopPropagation()
                          handleReturnEntity(entity)
                        }}
                        onPointerDown={(event) => event.stopPropagation()}
                        aria-label="Recall entity to cluster"
                        title="Recall to cluster"
                        disabled={!onReturnToGroup}
                      >
                        <RotateCcw size={16} aria-hidden="true" />
                      </button>
                    )}
                    <button
                      type="button"
                      className="cluster-popup-entity-action"
                      onClick={(event) => {
                        event.stopPropagation()
                        onOpenEntityInfo?.(entityKey)
                      }}
                      onPointerDown={(event) => event.stopPropagation()}
                      aria-label="Open entity details"
                      title="Open details"
                      disabled={!onOpenEntityInfo}
                    >
                      <Eye size={16} aria-hidden="true" />
                    </button>
                    {!isCurrentSource && (
                      <button
                        type="button"
                        className="cluster-popup-entity-action"
                        onClick={(event) => {
                          event.stopPropagation()
                          onSetTargetEntity?.(entityKey)
                        }}
                        onPointerDown={(event) => event.stopPropagation()}
                        aria-label="Use as relationship source"
                        title="Set as source"
                        disabled={!onSetTargetEntity}
                      >
                        <Target size={16} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          ) : (
            <div className="cluster-popup-empty">No entities in this cluster.</div>
          )}
        </div>
      </div>
    </div>,
    portalEl
  )
}
