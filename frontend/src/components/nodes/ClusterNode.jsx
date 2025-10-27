import { useState, useEffect, useMemo } from 'react'
import { Handle, Position } from 'reactflow'
import ClusterPopup from '../ui/ClusterPopup'
import './nodeStyles.css'

export default function ClusterNode({ id, data }) {
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

    const boardEl =
      document.querySelector('.react-flow__renderer') ||
      document.querySelector('.react-flow')

    const boardRect = boardEl?.getBoundingClientRect()
    const viewportWidth = boardRect?.width ?? window.innerWidth
    const viewportHeight = boardRect?.height ?? window.innerHeight
    const panelWidth = 420
    const panelHeight = Math.min(viewportHeight * 0.7, 520)
    const offset = 16

    const baseX = e.clientX - (boardRect?.left ?? 0)
    const baseY = e.clientY - (boardRect?.top ?? 0)

    let x = baseX + offset
    let y = baseY - panelHeight / 2

    const maxX = viewportWidth - panelWidth - offset
    const minX = offset
    if (x > maxX) {
      x = Math.max(minX, baseX - panelWidth - offset)
    }
    x = Math.max(minX, Math.min(x, maxX))

    const maxY = viewportHeight - panelHeight - offset
    const minY = offset
    if (y < minY) {
      y = minY
    } else if (y > maxY) {
      y = maxY
    }

    setPopupPos({ x, y })
    setOpen(true)
  }

  const handleClose = () => setOpen(false)

  const placedIds = useMemo(
    () => new Set((data?.placedEntityIds || []).map((value) => String(value))),
    [data?.placedEntityIds]
  )
  const totalCount = data?.count ?? containedEntities.length
  const placedCount = placedIds.size
  const availableCount = Math.max(totalCount - placedCount, 0)

  let countLabel = 'No related entities'
  if (totalCount > 0) {
    if (availableCount === 0) {
      countLabel = `All ${totalCount === 1 ? 'entity' : 'entities'} on board`
    } else if (availableCount === totalCount) {
      countLabel = `${totalCount} ${totalCount === 1 ? 'entity' : 'entities'} inside`
    } else {
      countLabel = `${availableCount} of ${totalCount} ${
        totalCount === 1 ? 'entity' : 'entities'
      } not on board`
    }
  }

  const relationshipLabel = data?.relationshipType || data?.label || 'Cluster'

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
          <div className="cluster-node__badge">{availableCount}</div>
        </div>
        <div className="cluster-node__label">{relationshipLabel}</div>
        <div className="cluster-node__count">{countLabel}</div>
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
            id,
            label: data?.label,
            entities: containedEntities,
            relationshipType: data?.relationshipType,
            sourceId: data?.sourceId,
            placedEntityIds: data?.placedEntityIds || [],
          }}
          onClose={handleClose}
          onAddToBoard={data?.onAddToBoard}
          onReturnToGroup={data?.onReturnToGroup}
        />
      )}
    </>
  )
}
