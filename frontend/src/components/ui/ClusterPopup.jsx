import ReactDOM from 'react-dom'
import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

export default function ClusterPopup({ position, cluster, onClose, onDragEntity }) {
  const { label, relationshipType, entities = [] } = cluster || {}
  const [draggingId, setDraggingId] = useState(null)
  const [portalEl, setPortalEl] = useState(null)

  useEffect(() => {
    const el = document.createElement('div')
    el.style.position = 'fixed'
    el.style.inset = '0'
    el.style.zIndex = '2500'
    document.body.appendChild(el)
    setPortalEl(el)
    return () => document.body.removeChild(el)
  }, [])

  const handleDragStart = (e, entity) => {
    e.dataTransfer.setData('application/x-entity', JSON.stringify(entity))
    e.dataTransfer.effectAllowed = 'copyMove'
    setDraggingId(entity.id)
  }

  const handleDragEnd = (e, entity) => {
    // when drag actually ends outside this popup, ReactFlow will handle the drop
    setDraggingId(null)
  }

  if (!portalEl) return null

  return ReactDOM.createPortal(
    <>
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[2499]"
        onClick={onClose}
      />
      <div
        className="absolute z-[2500] w-[420px] max-h-[70vh] rounded-2xl border border-slate-200 
                   bg-white/95 backdrop-blur shadow-2xl overflow-hidden transition-transform animate-[fadeIn_0.15s_ease]"
        style={{
          top: `${position?.y ?? 100}px`,
          left: `${position?.x ?? 100}px`,
        }}
      >
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between bg-white/95 backdrop-blur px-4 py-3 border-b border-slate-200">
          <div>
            <div className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              {relationshipType || 'Cluster'}
            </div>
            <div className="text-base font-bold text-slate-800 truncate">
              {label || 'Entities'}
            </div>
          </div>
          <button
            onClick={onClose}
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
                className={`rounded-xl border border-slate-200 bg-white p-3 shadow-sm hover:shadow-md 
                  transition-all cursor-grab active:cursor-grabbing
                  ${draggingId === entity.id ? 'opacity-70 bg-slate-100 scale-[0.98]' : ''}`}
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
    </>,
    portalEl
  )
}
