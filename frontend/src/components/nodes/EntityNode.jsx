import { Handle, Position } from 'reactflow'
import './nodeStyles.css'

export default function EntityNode({ data }) {
  const isCenter = Boolean(data?.isCenter)
  const label = data?.label || 'Entity'
  const typeName = data?.typeName || 'Entity'
  const inheritedStyle = data?.style || {}

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

      {isCenter && (
        <span className="entity-node__center-indicator" />
      )}

      <div className="entity-node__content">
        <div className="entity-node__label" title={label}>
          {label}
        </div>
        {typeName && (
          <div className={`entity-node__type-pill ${isCenter ? 'is-center' : ''}`}>
            {typeName}
          </div>
        )}
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
