import React from 'react'
import { Handle, Position } from 'reactflow'
import './graphStyles.css'

const HANDLE_STYLE = {
  width: 10,
  height: 10,
  borderRadius: '50%',
  border: '2px solid #0f172a',
}

export default function RelationshipClusterNode({ data }) {
  const { label, count, typeName } = data || {}
  const safeLabel = label || typeName || 'Related entities'

  return (
    <div className="cluster-node-card">
      <Handle
        type="target"
        position={Position.Top}
        style={{ ...HANDLE_STYLE, marginTop: -8, background: '#a855f7' }}
      />
      <div className="cluster-node-content">
        <span className="cluster-node-count">{count}</span>
        <div className="cluster-node-text">
          <span className="cluster-node-label">{safeLabel}</span>
          {typeName ? <span className="cluster-node-type">{typeName}</span> : null}
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ ...HANDLE_STYLE, marginBottom: -8, background: '#f97316' }}
      />
    </div>
  )
}
