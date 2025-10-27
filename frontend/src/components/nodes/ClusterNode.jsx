import { useState, useEffect, useCallback } from 'react'
import { Handle, Position } from 'reactflow'
import { X } from 'lucide-react'

export default function ClusterNode({ data }) {
  const [expanded, setExpanded] = useState(false)
  const [entities, setEntities] = useState([])

  useEffect(() => {
    console.log('🟡 ClusterNode data received:', data)

    if (Array.isArray(data?.containedIds) && data.containedIds.length > 0) {
      const allNodes = Array.isArray(data?.allNodes) ? data.allNodes : []

      // Convert all IDs to string for comparison
      const containedEntities = allNodes.filter((n) =>
        data.containedIds.map(String).includes(String(n.id))
      )

      console.log('✅ Matching contained entities for', data?.label, containedEntities)
      setEntities(containedEntities.map((n) => ({ id: n.id, name: n.name })))
    } else {
      console.log('⚠️ No containedIds or allNodes found for cluster:', data?.label)
      setEntities([])
    }
  }, [data])

  const handleClick = useCallback(() => {
    setExpanded((prev) => !prev)
  }, [])

  const handleDragStart = (e, entity) => {
    e.dataTransfer.setData('application/reactflow', JSON.stringify({ type: 'entity', entity }))
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDrop = (e) => {
    const droppedData = e.dataTransfer.getData('application/reactflow')
    if (!droppedData) return
    try {
      const { entity } = JSON.parse(droppedData)
      setEntities((prev) => {
        if (prev.find((e) => e.id === entity.id)) return prev
        return [...prev, entity]
      })
    } catch {}
  }

  return (
    <div
      className="relative rounded-2xl border border-amber-400 bg-amber-100/80 px-4 py-3 text-sm text-amber-900 shadow-lg hover:shadow-xl transition"
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <div className="text-base font-semibold leading-tight">{data?.label}</div>
      {data?.relationshipType && (
        <div className="mt-1 text-xs font-medium uppercase tracking-wide text-amber-700">
          {data.relationshipType}
        </div>
      )}

      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />

      {expanded && (
        <div className="absolute z-50 left-1/2 top-full mt-3 w-64 -translate-x-1/2 rounded-xl border border-amber-400 bg-white shadow-2xl p-3">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-semibold text-amber-800 text-sm">
              {entities.length} Entities
            </h4>
            <button
              onClick={() => setExpanded(false)}
              className="text-amber-700 hover:text-amber-900"
            >
              <X size={16} />
            </button>
          </div>

          {entities.length === 0 ? (
            <p className="text-xs text-gray-500">No entities in this cluster.</p>
          ) : (
            <ul className="max-h-48 overflow-auto">
              {entities.map((entity) => (
                <li
                  key={entity.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, entity)}
                  className="cursor-grab rounded-lg p-2 text-sm font-medium text-gray-700 hover:bg-amber-50 border border-transparent hover:border-amber-200 mb-1"
                >
                  {entity.name || `Entity ${entity.id}`}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}