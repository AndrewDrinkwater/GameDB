import { useState, useEffect } from 'react'
import { Handle, Position, useReactFlow } from 'reactflow'
import ClusterPopup from '../ui/ClusterPopup'

export default function ClusterNode({ id, data }) {
  const { project } = useReactFlow()
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
    const rect = e.currentTarget.getBoundingClientRect()
    // Position popup beside cluster node
    setPopupPos({ x: rect.right + window.scrollX + 10, y: rect.top + window.scrollY })
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

  return (
    <>
      <div
        className="relative rounded-2xl border border-amber-400 bg-amber-100/80 px-4 py-3 
                   text-sm text-amber-900 shadow-lg cursor-pointer hover:bg-amber-200 transition"
        onClick={handleOpen}
      >
        <Handle type="target" position={Position.Top} />
        <div className="text-base font-semibold leading-tight text-center">
          {data?.label || 'Cluster'}
        </div>
        {data?.relationshipType && (
          <div className="mt-1 text-xs font-medium uppercase tracking-wide text-amber-700 text-center">
            {data.relationshipType}
          </div>
        )}
        <div className="text-[11px] text-center text-amber-800 mt-2">
          {containedEntities.length} entities
        </div>
        <Handle type="source" position={Position.Bottom} />
      </div>

      {open && (
        <>
          <div
            className="fixed inset-0 z-[999] bg-black/20 backdrop-blur-sm"
            onClick={handleClose}
          />
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
        </>
      )}
    </>
  )
}
