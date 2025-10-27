import ReactDOM from 'react-dom'
import { useState, useEffect, useRef, useCallback } from 'react'
import { X } from 'lucide-react'

const PANEL_WIDTH = 420
const PANEL_MAX_HEIGHT = 520
const VIEWPORT_OFFSET = 16

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

export default function ClusterPopup({ position, cluster, onClose, onDragEntity }) {
  const { label, relationshipType, entities = [] } = cluster || {}
  const [draggingId, setDraggingId] = useState(null)
  const [portalEl, setPortalEl] = useState(null)
  const [currentPos, setCurrentPos] = useState({
    x: position?.x ?? 100,
    y: position?.y ?? 100,
  })
  const panelRef = useRef(null)
  const dragState = useRef(null)

  const getBounds = () => {
    const width = panelRef.current?.offsetWidth ?? PANEL_WIDTH
    const height =
      panelRef.current?.offsetHeight ?? Math.min(window.innerHeight * 0.7, PANEL_MAX_HEIGHT)
    const offset = VIEWPORT_OFFSET

    return {
      minX: offset,
      minY: offset,
      maxX: Math.max(offset, window.innerWidth - width - offset),
      maxY: Math.max(offset, window.innerHeight - height - offset),
    }
  }

  useEffect(() => {
    const el = document.createElement('div')
    el.style.position = 'fixed'
    el.style.inset = '0'
    el.style.zIndex = '2500'
    el.style.pointerEvents = 'none'
    document.body.appendChild(el)
    setPortalEl(el)
    return () => document.body.removeChild(el)
  }, [])

  useEffect(() => {
    setCurrentPos({
      x: position?.x ?? 100,
      y: position?.y ?? 100,
    })
  }, [position?.x, position?.y])

  const handlePointerMove = useCallback((event) => {
    if (!dragState.current) return

    const { offsetX, offsetY, bounds } = dragState.current
    const x = clamp(event.clientX - offsetX, bounds.minX, bounds.maxX)
    const y = clamp(event.clientY - offsetY, bounds.minY, bounds.maxY)
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

    const bounds = getBounds()
    const offsetX = event.clientX - (currentPos?.x ?? bounds.minX)
    const offsetY = event.clientY - (currentPos?.y ?? bounds.minY)

    dragState.current = {
      offsetX,
      offsetY,
      bounds,
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

  const handleDragStart = (e, entity) => {
    e.dataTransfer.setData('application/x-entity', JSON.stringify(entity))
    e.dataTransfer.effectAllowed = 'copyMove'
    setDraggingId(entity.id)
    onDragEntity?.('remove', entity)
  }

  const handleDragEnd = (e, entity) => {
    setDraggingId(null)
    if (e.dataTransfer.dropEffect === 'none') {
      onDragEntity?.('add', entity)
    }
  }

  if (!portalEl) return null

  return ReactDOM.createPortal(
    <div className="pointer-events-none fixed inset-0">
      <div
        ref={panelRef}
        className="pointer-events-auto absolute z-[2500] w-[420px] max-h-[70vh] rounded-2xl border border-slate-200 bg-white/95 backdrop-blur shadow-2xl overflow-hidden transition-transform animate-[fadeIn_0.15s_ease]"
        style={{
          top: `${currentPos?.y ?? 100}px`,
          left: `${currentPos?.x ?? 100}px`,
        }}
      >
        {/* Header */}
        <div
          className="sticky top-0 flex items-center justify-between bg-white/95 backdrop-blur px-4 py-3 border-b border-slate-200 cursor-grab active:cursor-grabbing select-none"
          onPointerDown={handleDragStartPopup}
        >
          <div className="pr-3">
            <div className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              {relationshipType || 'Cluster'}
            </div>
            <div className="text-base font-bold text-slate-800 truncate">
              {label || 'Entities'}
            </div>
          </div>
          <button
            onClick={handleClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-4 py-2 text-[11px] text-slate-600 bg-slate-50 border-b border-slate-200">
          Drag a card onto the board to place it; drop back here to re-cluster.
        </div>

        <div className="p-4 grid grid-cols-2 gap-3 overflow-y-auto max-h-[calc(70vh-92px)]">
          {entities.length ? (
            entities.map((entity) => (
              <div
                key={entity.id}
                draggable
                onDragStart={(e) => handleDragStart(e, entity)}
                onDragEnd={(e) => handleDragEnd(e, entity)}
                className={`rounded-xl border border-slate-200 bg-white p-3 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing ${draggingId === entity.id ? 'opacity-70 bg-slate-100 scale-[0.98]' : ''}`}
              >
                <div className="text-sm font-semibold text-slate-800 truncate">
                  {entity.name || `Entity ${entity.id}`}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                  ID: {entity.id}
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-sm text-slate-600 text-center">
              No entities in this cluster.
            </div>
          )}
        </div>
      </div>
    </div>,
    portalEl
  )
}
