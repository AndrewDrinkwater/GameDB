import { useState, useEffect } from 'react'
import { Handle, Position } from 'reactflow'
import ClusterPopup from '../ui/ClusterPopup'

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

  const relationshipCount = data?.count ?? containedEntities.length

  return (
    <>
      <div
        className="relative flex cursor-pointer flex-col gap-2 rounded-3xl border border-amber-300/80 bg-gradient-to-b from-amber-50 via-white to-amber-100 px-5 py-4 text-sm text-amber-900 shadow-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2xl"
        onClick={handleOpen}
      >
        <Handle type="target" position={Position.Top} />
        <div className="flex items-center justify-between gap-2">
          <div className="rounded-full bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
            Cluster
          </div>
          <div className="flex items-center gap-1 rounded-full bg-amber-500/20 px-3 py-1 text-[11px] font-semibold text-amber-800">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            {relationshipCount} relationships
          </div>
        </div>
        <div className="text-base font-semibold leading-tight text-center">
          {data?.label || 'Cluster'}
        </div>
        {data?.relationshipType && (
          <div className="text-xs font-medium uppercase tracking-wide text-amber-700 text-center">
            {data.relationshipType}
          </div>
        )}
        <div className="text-[11px] text-center text-amber-700">
          {containedEntities.length} entities inside
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
