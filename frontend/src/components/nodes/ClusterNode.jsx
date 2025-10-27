import { useState, useEffect } from 'react'
import { Handle, Position } from 'reactflow'
import ClusterPopup from '../ui/ClusterPopup'
import './nodeStyles.css'

export default function ClusterNode({ data }) {
  const [open, setOpen] = useState(false)
  const [popupPos, setPopupPos] = useState({ x: 0, y: 0 })
  const [containedEntities, setContainedEntities] = useState([])

  useEffect(() => {
    const containedIds =
      data?.containedIds || data?.data?.containedIds || []
    const allNodes =
      data?.allNodes || data?.data?.allNodes || []

    if (containedIds.length && allNodes.length) {
      const matches = allNodes.filter((n) => containedIds.includes(n.id))
      setContainedEntities(matches)
    } else {
      setContainedEntities([])
    }
  }, [data])

  const handleOpen = (e) => {
    e.stopPropagation()

    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const scrollX = window.scrollX
    const scrollY = window.scrollY
    const panelWidth = 420
    const panelHeight = Math.min(viewportHeight * 0.7, 520)
    const offset = 16

    let x = e.clientX + scrollX + offset
    let y = e.clientY + scrollY - panelHeight / 2

    const maxX = scrollX + viewportWidth - panelWidth - offset
    const minX = scrollX + offset
    if (x > maxX) {
      x = Math.max(minX, e.clientX + scrollX - panelWidth - offset)
    }
    x = Math.max(minX, Math.min(x, maxX))

    const maxY = scrollY + viewportHeight - panelHeight - offset
    const minY = scrollY + offset
    if (y < minY) {
      y = minY
    } else if (y > maxY) {
      y = maxY
    }

    setPopupPos({ x, y })
    setOpen(true)
  }

  const handleClose = () => setOpen(false)

  const handleDragEntity = (action, entity) => {
    if (!entity) return
    if (action === 'remove') {
      setContainedEntities((prev) => prev.filter((e) => e.id !== entity.id))
    } else if (action === 'add') {
      if (!containedEntities.some((e) => e.id === entity.id)) {
        setContainedEntities((prev) => [...prev, entity])
      }
    }
  }

  const relationshipCount = data?.count ?? containedEntities.length

  return (
    <>
      <div className="cluster-node" onClick={handleOpen}>
        <Handle
          type="target"
          position={Position.Top}
          style={{
            width: 12,
            height: 12,
            background: '#fcd34d',
            border: '1px solid #fff',
            borderRadius: '999px',
            boxShadow: '0 1px 2px rgba(120, 53, 15, 0.2)',
          }}
        />
        <div className="cluster-node__header">
          <div className="cluster-node__badge">
            Cluster
          </div>
          <div className="cluster-node__meta">
            <span className="cluster-node__meta-dot" />
            {relationshipCount} relationships
          </div>
        </div>
        <div className="cluster-node__label">
          {data?.label || 'Cluster'}
        </div>
        {data?.relationshipType && (
          <div className="cluster-node__relationship">
            {data.relationshipType}
          </div>
        )}
        <div className="cluster-node__count">
          {containedEntities.length} entities inside
        </div>
        <Handle
          type="source"
          position={Position.Bottom}
          style={{
            width: 12,
            height: 12,
            background: '#fcd34d',
            border: '1px solid #fff',
            borderRadius: '999px',
            boxShadow: '0 1px 2px rgba(120, 53, 15, 0.2)',
          }}
        />
      </div>

      {open && (
        <ClusterPopup
          position={popupPos}
          cluster={{
            label: data?.label,
            entities: containedEntities,
            relationshipType: data?.relationshipType,
            sourceId: data?.sourceId,
          }}
          onClose={handleClose}
          onDragEntity={handleDragEntity}
        />
      )}
    </>
  )
}
