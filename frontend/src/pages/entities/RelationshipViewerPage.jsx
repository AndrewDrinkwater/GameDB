import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  applyEdgeChanges,
  applyNodeChanges
} from 'reactflow'
import 'reactflow/dist/style.css'
import { getEntityGraph } from '../../api/entities.js'

const CLUSTER_THRESHOLD = 5

function slugifyTypeName(name) {
  return String(name ?? 'group')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function layoutNodesRadially(nodes, centerId) {
  if (!Array.isArray(nodes) || nodes.length === 0) {
    return []
  }

  const centerKey = String(centerId)
  const layoutNodes = nodes.map((node) => ({
    ...node,
    position: { x: 0, y: 0, ...(node.position || {}) },
  }))

  const centerIndex = layoutNodes.findIndex((node) => node.id === centerKey)
  if (centerIndex !== -1) {
    layoutNodes[centerIndex] = {
      ...layoutNodes[centerIndex],
      position: { x: 0, y: 0 },
    }
  }

  const orbitingNodes = layoutNodes.filter((node) => node.id !== centerKey)
  if (orbitingNodes.length > 0) {
    const radius = Math.max(orbitingNodes.length * 90, 220)
    orbitingNodes.forEach((node, index) => {
      const angle = (2 * Math.PI * index) / orbitingNodes.length
      node.position = {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      }
    })
  }

  const minX = Math.min(...layoutNodes.map((node) => node.position?.x ?? 0))
  const minY = Math.min(...layoutNodes.map((node) => node.position?.y ?? 0))
  const offsetX = Number.isFinite(minX) ? -minX + 200 : 0
  const offsetY = Number.isFinite(minY) ? -minY + 200 : 0

  return layoutNodes.map((node) => ({
    ...node,
    position: {
      x: (node.position?.x ?? 0) + offsetX,
      y: (node.position?.y ?? 0) + offsetY,
    },
  }))
}

function buildReactFlowGraph(data, entityId, clusterThreshold = CLUSTER_THRESHOLD) {
  const centerKey = String(entityId)
  const rawNodes = Array.isArray(data?.nodes) ? data.nodes : []
  const rawEdges = Array.isArray(data?.edges) ? data.edges : []

  const parsedEdges = rawEdges.map((edge, index) => {
    const source = String(edge.source)
    const target = String(edge.target)
    const typeName = edge?.type?.name || edge?.label || 'Relationship'
    return {
      id: edge?.id != null ? String(edge.id) : `${source}-${target}-${index}`,
      source,
      target,
      typeName,
      label: edge?.type?.name || edge?.label || typeName,
    }
  })

  const groupedByType = new Map()
  parsedEdges.forEach((edge) => {
    const { source, target, typeName } = edge
    let counterpart = null

    if (source === centerKey && target !== centerKey) {
      counterpart = target
    } else if (target === centerKey && source !== centerKey) {
      counterpart = source
    }

    if (!counterpart) return

    if (!groupedByType.has(typeName)) {
      groupedByType.set(typeName, { edges: [], nodeIds: new Set() })
    }

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
      group.edges.forEach((edge) => consumedEdgeIds.add(edge.id))
      nodeIds.forEach((nodeId) => hiddenNodeIds.add(nodeId))

      const baseId = slugifyTypeName(typeName || 'cluster') || 'cluster'
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
        },
        position: { x: 0, y: 0 },
        style: {
          borderRadius: 16,
          border: '1px solid #f59e0b',
          background: '#fef3c7',
          boxShadow: '0 4px 10px rgba(245, 158, 11, 0.25)',
          padding: 12,
          color: '#92400e',
          fontWeight: 600,
        },
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
    .filter((node) => !hiddenNodeIds.has(String(node.id)))
    .map((node) => {
      const id = String(node.id)
      const label = node?.name || node?.label || `Entity ${node.id}`
      const isCenter = id === centerKey

      const style = isCenter
        ? {
            borderRadius: 16,
            border: '2px solid #2563eb',
            background: '#dbeafe',
            padding: 14,
            boxShadow: '0 6px 14px rgba(37, 99, 235, 0.2)',
            color: '#1d4ed8',
            fontWeight: 700,
          }
        : {
            borderRadius: 14,
            border: '1px solid #cbd5f5',
            background: '#ffffff',
            padding: 12,
            boxShadow: '0 4px 10px rgba(15, 23, 42, 0.12)',
            color: '#0f172a',
            fontWeight: 600,
          }

      return {
        id,
        type: 'default',
        data: { label, isCenter, original: node },
        position: { x: 0, y: 0 },
        style,
      }
    })

  const standardEdges = parsedEdges
    .filter((edge) => !consumedEdgeIds.has(edge.id))
    .map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: 'smoothstep',
      label: edge.label,
      animated: true,
      data: { relationshipType: edge.typeName },
      style: { strokeWidth: 1.5 },
    }))

  const layoutedNodes = layoutNodesRadially([...baseNodes, ...clusterNodes], centerKey)

  return {
    nodes: layoutedNodes,
    edges: [...standardEdges, ...clusterEdges],
  }
}

function ClusterNode({ data }) {
  return (
    <div className="rounded-2xl border border-amber-400 bg-amber-100/80 px-4 py-3 text-sm text-amber-900 shadow-lg">
      <div className="text-base font-semibold leading-tight">{data?.label}</div>
      {data?.relationshipType ? (
        <div className="mt-1 text-xs font-medium uppercase tracking-wide text-amber-700">
          {data.relationshipType}
        </div>
      ) : null}
    </div>
  )
}

export default function RelationshipViewerPage() {
  const { entityId } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])

  const nodeTypes = useMemo(
    () => ({
      cluster: ClusterNode,
    }),
    []
  )

  const onNodesChange = useCallback((changes) => {
    setNodes((current) => applyNodeChanges(changes, current))
  }, [])

  const onEdgesChange = useCallback((changes) => {
    setEdges((current) => applyEdgeChanges(changes, current))
  }, [])

  useEffect(() => {
    if (!entityId) return

    let isActive = true

    async function fetchData() {
      setLoading(true)
      setError(null)

      try {
        const graph = await getEntityGraph(entityId)
        const layouted = buildReactFlowGraph(graph, entityId, CLUSTER_THRESHOLD)

        if (!isActive) return

        setNodes(layouted.nodes)
        setEdges(layouted.edges)
      } catch (err) {
        if (!isActive) return

        console.error('Failed to load entity graph', err)
        setError(err.message || 'Failed to load graph')
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      isActive = false
    }
  }, [entityId])

  if (loading) return <p className="p-4">Loading graph...</p>
  if (error) return <p className="p-4 text-red-500">Error: {error}</p>
  if (!nodes.length) {
    return <p className="p-4">No relationships found for this entity.</p>
  }

  return (
    <div className="h-screen w-full bg-gray-100">
      <h1 className="text-2xl font-bold p-4">Relationship Viewer</h1>
      <div className="h-[80vh] w-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
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
