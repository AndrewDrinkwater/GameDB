import { useCallback, useEffect, useState } from 'react'
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
          allNodes: rawNodes,
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

  const baseNodes = rawNodes
    .filter((n) => !hiddenNodeIds.has(String(n.id)))
    .map((node) => {
      const id = String(node.id)
      const label = node?.name || `Entity ${id}`
      const isCenter = id === centerKey
      return {
        id,
        type: 'entity',
        data: { label, isCenter },
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
  const [isDragging, setIsDragging] = useState(false)

  const onNodesChange = useCallback((changes) => setNodes((n) => applyNodeChanges(changes, n)), [])
  const onEdgesChange = useCallback((changes) => setEdges((e) => applyEdgeChanges(changes, e)), [])

  const handleDropOnBoard = (e) => {
    e.preventDefault()
    const raw = e.dataTransfer.getData('application/x-entity')
    if (!raw) return

    try {
      const entity = JSON.parse(raw)

      const newNode = {
        id: entity.id,
        type: 'entity',
        position: { x: e.clientX - 150, y: e.clientY - 100 },
        data: { label: entity.name || `Entity ${entity.id}`, isCenter: false },
      }

      setNodes((prev) => [...prev, newNode])

      const sourceCluster = nodes.find((n) => n.type === 'cluster')
      if (sourceCluster?.data?.sourceId) {
        setEdges((prev) => [
          ...prev,
          {
            id: `edge-${sourceCluster.data.sourceId}-${entity.id}`,
            source: sourceCluster.data.sourceId,
            target: entity.id,
            type: 'smoothstep',
            label: sourceCluster.data.relationshipType || 'Membership',
          },
        ])
      }
    } catch {}
    setIsDragging(false)
  }

  const handleDragOver = (e) => e.preventDefault()

  useEffect(() => {
    if (!entityId) return
    let active = true
    async function fetchData() {
      setLoading(true)
      setError(null)
      try {
        const graph = await getEntityGraph(entityId)
        const layouted = buildReactFlowGraph(graph, entityId)
        if (active) {
          setNodes(layouted.nodes)
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
  }, [entityId])

  if (loading) return <p className="p-4">Loading graph...</p>
  if (error) return <p className="p-4 text-red-500">Error: {error}</p>
  if (!nodes.length) return <p className="p-4">No relationships found for this entity.</p>

  return (
    <div className="flex flex-col h-screen w-full bg-gray-100">
      <header className="p-4 border-b bg-white shadow-sm">
        <h1 className="text-2xl font-bold text-gray-800">
          Relationship Viewer (Hierarchical + Clustering)
        </h1>
      </header>

      <div className="flex-1 min-h-0 relative">
        {isDragging && (
          <div className="absolute inset-0 bg-blue-100/30 border-2 border-blue-400 border-dashed z-[10]" />
        )}

        <div
          className="w-full h-full relative"
          style={{ height: 'calc(100vh - 80px)' }}
          onDrop={handleDropOnBoard}
          onDragOver={handleDragOver}
          onDragEnter={() => setIsDragging(true)}
          onDragLeave={() => setIsDragging(false)}
        >
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
