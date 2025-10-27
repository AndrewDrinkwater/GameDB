import { useCallback, useEffect, useState, useMemo } from 'react'
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

const CLUSTER_THRESHOLD = 5
const nodeTypes = { cluster: ClusterNode }
const edgeTypes = {}

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
    const { source, target, typeName } = edge
    let counterpart = null
    if (source === centerKey && target !== centerKey) counterpart = target
    else if (target === centerKey && source !== centerKey) counterpart = source
    if (!counterpart) return

    if (!groupedByType.has(typeName)) groupedByType.set(typeName, { edges: [], nodeIds: new Set() })
    const group = groupedByType.get(typeName)
    group.edges.push(edge)
    group.nodeIds.add(counterpart)
  })

  const hiddenNodeIds = new Set()
  const consumedEdgeIds = new Set()
  const clusterNodes = []
  const clusterEdges = []
  const generatedClusterIds = new Set()

  for (const [typeName, group] of groupedByType.entries()) {
    const nodeIds = Array.from(group.nodeIds)
    const count = nodeIds.length
    if (count >= clusterThreshold) {
      group.edges.forEach((e) => consumedEdgeIds.add(e.id))
      nodeIds.forEach((id) => hiddenNodeIds.add(id))

      const baseId = typeName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      let clusterId = `cluster-${baseId}`
      let suffix = 1
      while (generatedClusterIds.has(clusterId)) {
        suffix += 1
        clusterId = `cluster-${baseId}-${suffix}`
      }
      generatedClusterIds.add(clusterId)

      clusterNodes.push({
        id: clusterId,
        type: 'cluster',
        data: {
          label: `${count} ${typeName}${count === 1 ? '' : 's'}`,
          relationshipType: typeName,
          count,
          containedIds: nodeIds,
          allNodes: rawNodes, // ✅ Pass all nodes
          sourceId: centerKey,
        },
        position: { x: 0, y: 0 },
      })

      clusterEdges.push({
        id: `cluster-edge-${clusterId}`,
        source: centerKey,
        target: clusterId,
        type: 'smoothstep',
        label: `${typeName} (${count})`,
        animated: false,
        data: { relationshipType: typeName, count, isClusterEdge: true },
        style: { strokeWidth: 2 },
      })
    }
  }

  const baseNodes = rawNodes
    .filter((n) => !hiddenNodeIds.has(String(n.id)))
    .map((node) => ({
      id: String(node.id),
      type: 'default',
      data: { label: node.name || `Entity ${node.id}` },
      position: { x: 0, y: 0 },
    }))

  const standardEdges = parsedEdges
    .filter((e) => !consumedEdgeIds.has(e.id))
    .map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: 'smoothstep',
      label: e.label,
      animated: true,
    }))

  return { nodes: [...baseNodes, ...clusterNodes], edges: [...standardEdges, ...clusterEdges] }
}

export default function RelationshipViewerPage() {
  const { entityId } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])

  const onNodesChange = useCallback((changes) => setNodes((current) => applyNodeChanges(changes, current)), [])
  const onEdgesChange = useCallback((changes) => setEdges((current) => applyEdgeChanges(changes, current)), [])

  const memoNodeTypes = useMemo(() => nodeTypes, [])
  const memoEdgeTypes = useMemo(() => edgeTypes, [])

  useEffect(() => {
    if (!entityId) return
    let isActive = true

    async function fetchData() {
      setLoading(true)
      setError(null)
      try {
        const graph = await getEntityGraph(entityId)
        const layouted = buildReactFlowGraph(graph, entityId)
        if (isActive) {
          setNodes(layouted.nodes)
          setEdges(layouted.edges)
        }
      } catch (err) {
        if (isActive) setError(err.message || 'Failed to load graph')
      } finally {
        if (isActive) setLoading(false)
      }
    }
    fetchData()
    return () => {
      isActive = false
    }
  }, [entityId])

  if (loading) return <p className="p-4">Loading graph...</p>
  if (error) return <p className="p-4 text-red-500">Error: {error}</p>
  if (!nodes.length) return <p className="p-4">No relationships found for this entity.</p>

  return (
    <div className="flex flex-col h-screen w-full bg-gray-100">
      <header className="p-4 border-b bg-white shadow-sm">
        <h1 className="text-2xl font-bold text-gray-800">Relationship Viewer</h1>
      </header>
      <div className="flex-1 min-h-0">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={memoNodeTypes}
          edgeTypes={memoEdgeTypes}
          fitView
        >
          <MiniMap />
          <Controls />
          <Background gap={16} />
        </ReactFlow>
      </div>
    </div>
  )
}