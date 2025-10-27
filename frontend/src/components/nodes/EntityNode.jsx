import { Handle, Position } from 'reactflow'
import { Info, Target } from 'lucide-react'
import './nodeStyles.css'

export default function EntityNode({ data }) {
  const isCenter = Boolean(data?.isCenter)
  const label = data?.label || 'Entity'
  const typeName = data?.typeName || 'Entity'
  const inheritedStyle = data?.style || {}
  const entityId = data?.entityId || data?.id

  const handleSetTarget = (event) => {
    event?.preventDefault()
    event?.stopPropagation()
    if (!data?.onSetTarget || !entityId || isCenter) return
    data.onSetTarget(String(entityId))
  }

  const handleOpenInfo = (event) => {
    event?.preventDefault()
    event?.stopPropagation()
    if (!data?.onOpenInfo || !entityId) return
    data.onOpenInfo(String(entityId))
  }

  return (
    <div
      className={`entity-node ${isCenter ? 'entity-node--center' : 'entity-node--standard'}`}
      style={{ ...inheritedStyle }}
    >
      <Handle
        id="top"
        type="target"
        position={Position.Top}
        style={{
          width: 12,
          height: 12,
          background: '#cbd5f5',
          border: '1px solid #fff',
          borderRadius: '999px',
          boxShadow: '0 1px 2px rgba(15, 23, 42, 0.25)',
        }}
      />

      {isCenter && <span className="entity-node__center-indicator" />}

      <div className="entity-node__content">
        <div className="entity-node__row entity-node__row--title">
          <div className="entity-node__label" title={label}>
            {label}
          </div>
        </div>
        <div className="entity-node__row entity-node__row--meta">
          {typeName && (
            <div className={`entity-node__type-pill ${isCenter ? 'is-center' : ''}`}>
              {typeName}
            </div>
          )}
          <div className="entity-node__actions" aria-hidden={!data?.onSetTarget && !data?.onOpenInfo}>
            <button
              type="button"
              className="entity-node__action"
              onClick={handleSetTarget}
              onPointerDown={(event) => event.stopPropagation()}
              aria-label="Use as relationship source"
              disabled={isCenter || !data?.onSetTarget}
            >
              <Target size={14} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="entity-node__action"
              onClick={handleOpenInfo}
              onPointerDown={(event) => event.stopPropagation()}
              aria-label="Open entity in new window"
              disabled={!data?.onOpenInfo}
            >
              <Info size={14} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <Handle
        id="bottom"
        type="source"
        position={Position.Bottom}
        style={{
          width: 12,
          height: 12,
          background: '#cbd5f5',
          border: '1px solid #fff',
          borderRadius: '999px',
          boxShadow: '0 1px 2px rgba(15, 23, 42, 0.25)',
        }}
      />
    </div>
  )
}
