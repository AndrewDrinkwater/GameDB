import React from 'react'
import './graphStyles.css'

export default function ClusterEntityNode({ data }) {
  const name = data?.name || data?.label || `Entity ${data?.id || ''}`
  const type = data?.type || data?.typeName || null
  const title = type ? `${name} (${type})` : name

  return (
    <div className="cluster-entity-node" title={title}>
      <div className="cluster-entity-node-inner">
        <span className="cluster-entity-node-name">{name}</span>
        {type ? <span className="cluster-entity-node-type">{type}</span> : null}
      </div>
    </div>
  )
}
