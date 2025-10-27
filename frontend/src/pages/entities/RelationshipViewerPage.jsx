import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  applyEdgeChanges,
  applyNodeChanges,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { getEntityGraph } from '../../api/entities.js'
import ClusterNode from '../../components/nodes/ClusterNode.jsx'
import EntityNode from '../../components/nodes/EntityNode.jsx'

const CLUSTER_THRESHOLD = 5
const nodeTypes = { cluster: ClusterNode, entity: EntityNode }
const edgeTypes = {}

function slugifyTypeName(name) {
  return String(name ?? 'group')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function layoutNodesHierarchically(nodes, edges, centerId) {
  const centerKey = String(centerId)
  const levels = new Map()
  const visited = new Set()

  levels.set(centerKey, 0)
  visited.add(centerKey)

  let queue = [centerKey]
  while (queue.length > 0) {
    const current = queue.shift()
    const currentLevel = levels.get(current)
    const connectedEdges = edges.filter(
      (e) => e.source === current || e.target === current
    )

    for (const edge of connectedEdges) {
      const isParent = edge.target === current
      const other = edge.source === current ? edge.target : edge.source
      if (!visited.has(other)) {
        visited.add(other)
        const nextLevel = isParent ? currentLevel - 1 : currentLevel + 1
        levels.set(other, nextLevel)
        queue.push(other)
      }
    }
  }

  const minLevel = Math.min(...levels.values())
  for (const [id, lvl] of levels.entries()) levels.set(id, lvl - minLevel)

  const grouped = {}
  for (const [id, level] of levels.entries()) {
    if (!grouped[level]) grouped[level] = []
    grouped[level].push(id)
  }

  const layouted = nodes.map((node) => {
    const level = levels.get(node.id) ?? 0
    const siblings = grouped[level] ?? []
    const index = siblings.indexOf(node.id)
    const spacingX = 220
    const spacingY = 200
    const totalWidth = (siblings.length - 1) * spacingX
    const x = index * spacingX - totalWidth / 2
    const y = level * spacingY
    return { ...node, position: { x, y } }
  })

  return layouted
}

function buildReactFlowGraph(data, entityId, clusterThreshold = CLUSTER_THRESHOLD) {
  const centerKey = String(entityId)
  const rawNodes = Array.isArray(data?.nodes) ? data.nodes : []
  const rawEdges = Array.isArray(data?.edges) ? data.edges : []

  const parsedEdges = rawEdges.map((edge, i) => {
    const source = String(edge.source)
    const target = String(edge.target)
    const typeName = edge?.type?.name || edge?.label || 'Relationship'
    return {
      id: edge?.id != null ? String(edge.id) : `${source}-${target}-${i}`,
      source,
      target,
      typeName,
      label: typeName,
    }
  })

  const groupedByType = new Map()
  parsedEdges.forEach((edge) => {
    const key = edge.typeName
    if (!groupedByType.has(key)) groupedByType.set(key, [])
    groupedByType.get(key).push(edge)
  })

  const enrichedNodes = rawNodes.map((node) => ({
    ...node,
    typeName: node?.type?.name || node?.typeName || null,
  }))

  const clusterNodes = []
  const clusterEdges = []
  const hiddenNodeIds = new Set()
  const consumedEdgeIds = new Set()

  for (const [type, edges] of groupedByType.entries()) {
    if (edges.length >= clusterThreshold) {
      const nodeIds = new Set()
      edges.forEach((e) => {
        nodeIds.add(e.source)
        nodeIds.add(e.target)
        consumedEdgeIds.add(e.id)
      })

      const containedIds = [...nodeIds].filter((id) => id !== centerKey)
      containedIds.forEach((id) => hiddenNodeIds.add(id))

      const clusterId = `cluster-${slugifyTypeName(type)}`
      clusterNodes.push({
        id: clusterId,
        type: 'cluster',
        data: {
          label: `${containedIds.length} ${type}${containedIds.length === 1 ? '' : 's'}`,
          relationshipType: type,
          count: containedIds.length,
          containedIds,
          sourceId: centerKey,
          allNodes: enrichedNodes,
        },
        position: { x: 0, y: 0 },
      })

      clusterEdges.push({
        id: `edge-${clusterId}`,
        source: centerKey,
        target: clusterId,
        type: 'smoothstep',
        label: `${type} (${containedIds.length})`,
        animated: false,
      })
    }
  }

  const baseNodes = enrichedNodes
    .filter((n) => !hiddenNodeIds.has(String(n.id)))
    .map((node) => {
      const id = String(node.id)
      const label = node?.name || `Entity ${id}`
      const isCenter = id === centerKey
      const typeName = node?.typeName || 'Entity'
      return {
        id,
        type: 'entity',
        data: { label, isCenter, typeName },
        position: { x: 0, y: 0 },
      }
    })

  const standardEdges = parsedEdges
    .filter((e) => !consumedEdgeIds.has(e.id))
    .map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: 'smoothstep',
      label: e.label,
      animated: true,
      data: { relationshipType: e.typeName },
      style: { strokeWidth: 1.5 },
    }))

  const layoutedNodes = layoutNodesHierarchically(
    [...baseNodes, ...clusterNodes],
    [...standardEdges, ...clusterEdges],
    centerKey
  )
  return { nodes: layoutedNodes, edges: [...standardEdges, ...clusterEdges] }
}

export default function RelationshipViewerPage() {
  const { entityId } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])
  const [boardEntities, setBoardEntities] = useState({})

  const onNodesChange = useCallback((changes) => setNodes((n) => applyNodeChanges(changes, n)), [])
  const onEdgesChange = useCallback((changes) => setEdges((e) => applyEdgeChanges(changes, e)), [])

  const handleAddEntityFromCluster = useCallback(
    (clusterInfo, entity) => {
      if (!clusterInfo || !entity) return

      const entityId = String(entity.id)

      setBoardEntities((prev) => {
        if (prev[entityId]) return prev
        return {
          ...prev,
          [entityId]: {
            clusterId: clusterInfo.id,
            relationshipType: clusterInfo.relationshipType || null,
            sourceId: clusterInfo.sourceId || null,
          },
        }
      })

      setNodes((prevNodes) => {
        let nextNodes = prevNodes
        const entityExists = prevNodes.some((node) => node.id === entityId)
        if (!entityExists) {
          const clusterNode = prevNodes.find((node) => node.id === clusterInfo.id)
          const baseX = clusterNode?.position?.x ?? 0
          const baseY = clusterNode?.position?.y ?? 0
          const existingPlacedCount = prevNodes.filter((node) => node.data?.isAdHoc).length
          const column = existingPlacedCount % 3
          const row = Math.floor(existingPlacedCount / 3)
          const offsetX = 200 + column * 60
          const offsetY = row * 90 - 40

          const newNode = {
            id: entityId,
            type: 'entity',
            position: {
              x: baseX + offsetX,
              y: baseY + offsetY,
            },
            data: {
              label: entity.name || `Entity ${entityId}`,
              typeName: entity?.type?.name || entity?.typeName || 'Entity',
              isCenter: false,
              isAdHoc: true,
            },
          }
          nextNodes = [...prevNodes, newNode]
        }

        return nextNodes.map((node) => {
          if (node.id !== clusterInfo.id || node.type !== 'cluster') return node
          const existingPlaced = new Set(node.data?.placedEntityIds || [])
          if (existingPlaced.has(entityId)) return node
          const updatedData = {
            ...node.data,
            placedEntityIds: [...existingPlaced, entityId],
          }
          return { ...node, data: updatedData }
        })
      })

      setEdges((prevEdges) => {
        const sourceId = clusterInfo?.sourceId ? String(clusterInfo.sourceId) : null
        const relationshipType = clusterInfo?.relationshipType
        if (!sourceId || !relationshipType) return prevEdges
        const edgeId = `edge-${sourceId}-${entityId}`
        if (prevEdges.some((edge) => edge.id === edgeId)) return prevEdges
        return [
          ...prevEdges,
          {
            id: edgeId,
            source: sourceId,
            target: entityId,
            type: 'smoothstep',
            label: relationshipType,
            animated: true,
            data: { relationshipType },
            style: { strokeWidth: 1.5 },
          },
        ]
      })
    },
    []
  )

  const placedEntityIds = useMemo(() => Object.keys(boardEntities), [boardEntities])

  useEffect(() => {
    if (!placedEntityIds.length) return
    setNodes((prevNodes) =>
      prevNodes.map((node) => {
        if (node.type !== 'cluster') return node
        const merged = Array.from(
          new Set([...(node.data?.placedEntityIds || []), ...placedEntityIds])
        )
        if (merged.length === (node.data?.placedEntityIds || []).length) return node
        return {
          ...node,
          data: {
            ...node.data,
            placedEntityIds: merged,
          },
        }
      })
    )
  }, [placedEntityIds])

  useEffect(() => {
    if (!entityId) return
    setBoardEntities({})
    let active = true
    async function fetchData() {
      setLoading(true)
      setError(null)
      try {
        const graph = await getEntityGraph(entityId)
        const layouted = buildReactFlowGraph(graph, entityId)
        if (active) {
          setNodes(
            layouted.nodes.map((node) => {
              if (node.type !== 'cluster') return node
              return {
                ...node,
                data: {
                  ...node.data,
                  onAddToBoard: handleAddEntityFromCluster,
                  placedEntityIds: [],
                },
              }
            })
          )
          setEdges(layouted.edges)
        }
      } catch (err) {
        if (active) setError(err.message || 'Failed to load graph')
      } finally {
        if (active) setLoading(false)
      }
    }
    fetchData()
    return () => {
      active = false
    }
  }, [entityId, handleAddEntityFromCluster])

  if (loading) return <p className="p-4">Loading graph...</p>
  if (error) return <p className="p-4 text-red-500">Error: {error}</p>
  if (!nodes.length) return <p className="p-4">No relationships found for this entity.</p>

  return (
    <div className="flex flex-col h-screen w-full bg-gray-100">
      <header className="p-4 border-b bg-white shadow-sm">
        <h1 className="text-2xl font-bold text-gray-800">Relationship Explorer</h1>
      </header>

      <div className="flex-1 min-h-0 relative">
        <div className="w-full h-full relative" style={{ height: 'calc(100vh - 80px)' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
          >
            <MiniMap />
            <Controls />
            <Background gap={16} />
          </ReactFlow>
        </div>
      </div>
    </div>
  )
}
