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

const DEFAULT_CLUSTER_WIDTH = 220
const DEFAULT_CLUSTER_HEIGHT = 160
const DEFAULT_ENTITY_WIDTH = 220
const DEFAULT_ENTITY_HEIGHT = 120
const CLUSTER_ENTITY_GAP = 40
const CLUSTER_ENTITY_VERTICAL_SPACING = DEFAULT_ENTITY_HEIGHT + CLUSTER_ENTITY_GAP

function positionEntitiesBelowCluster(nodes, clusterNode, placedIds = []) {
  if (!clusterNode || !Array.isArray(placedIds) || placedIds.length === 0) return nodes

  const order = placedIds.map((id) => String(id))
  const orderIndex = new Map(order.map((id, index) => [id, index]))

  const baseX = clusterNode?.position?.x ?? 0
  const baseY = clusterNode?.position?.y ?? 0
  const clusterWidth = clusterNode?.width ?? DEFAULT_CLUSTER_WIDTH
  const clusterHeight = clusterNode?.height ?? DEFAULT_CLUSTER_HEIGHT
  const startY = baseY + clusterHeight + CLUSTER_ENTITY_GAP

  let didChange = false
  const nextNodes = nodes.map((node) => {
    if (node.type !== 'entity' || !node.data?.isAdHoc) return node
    const index = orderIndex.get(String(node.id))
    if (index == null) return node

    const entityWidth = node?.width ?? DEFAULT_ENTITY_WIDTH
    const x = baseX + (clusterWidth - entityWidth) / 2
    const y = startY + index * CLUSTER_ENTITY_VERTICAL_SPACING

    if (node?.position?.x === x && node?.position?.y === y) return node
    didChange = true
    return {
      ...node,
      position: { x, y },
    }
  })

  return didChange ? nextNodes : nodes
}

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
        sourceHandle: 'bottom',
        targetHandle: 'top',
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
      sourceHandle: 'bottom',
      targetHandle: 'top',
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
        const clusterNode = prevNodes.find((node) => node.id === clusterInfo.id)
        const initialPlaced = Array.from(
          new Set(
            (
              clusterNode?.data?.placedEntityIds ||
              clusterInfo?.placedEntityIds ||
              []
            ).map((value) => String(value))
          )
        )

        const placedWithNew = initialPlaced.includes(entityId)
          ? initialPlaced
          : [...initialPlaced, entityId]

        const entityExists = prevNodes.some((node) => node.id === entityId)
        let nextNodes = prevNodes

        if (!entityExists) {
          const baseX = clusterNode?.position?.x ?? 0
          const baseY = clusterNode?.position?.y ?? 0
          const newNode = {
            id: entityId,
            type: 'entity',
            position: { x: baseX, y: baseY },
            data: {
              label: entity.name || `Entity ${entityId}`,
              typeName: entity?.type?.name || entity?.typeName || 'Entity',
              isCenter: false,
              isAdHoc: true,
            },
          }
          nextNodes = [...prevNodes, newNode]
        }

        nextNodes = nextNodes.map((node) => {
          if (node.id !== clusterInfo.id || node.type !== 'cluster') return node
          const existingPlaced = (node.data?.placedEntityIds || []).map((value) => String(value))
          const hasSamePlacement =
            existingPlaced.length === placedWithNew.length &&
            placedWithNew.every((value, index) => value === existingPlaced[index])

          if (hasSamePlacement) return node

          return {
            ...node,
            data: {
              ...node.data,
              placedEntityIds: placedWithNew,
            },
          }
        })

        const updatedClusterNode = nextNodes.find(
          (node) => node.id === clusterInfo.id && node.type === 'cluster'
        )

        return positionEntitiesBelowCluster(nextNodes, updatedClusterNode || clusterNode, placedWithNew)
      })

      setEdges((prevEdges) => {
        const clusterId = clusterInfo?.id ? String(clusterInfo.id) : null
        const relationshipType = clusterInfo?.relationshipType
        if (!clusterId || !relationshipType) return prevEdges
        const edgeId = `edge-${clusterId}-${entityId}`
        if (prevEdges.some((edge) => edge.id === edgeId)) return prevEdges
        return [
          ...prevEdges,
          {
            id: edgeId,
            source: clusterId,
            target: entityId,
            type: 'smoothstep',
            label: relationshipType,
            animated: true,
            data: { relationshipType, fromClusterId: clusterId },
            style: { strokeWidth: 1.5 },
            sourceHandle: 'bottom',
            targetHandle: 'top',
          },
        ]
      })
    },
    []
  )

  const handleReturnEntityToCluster = useCallback((clusterInfo, entity) => {
    if (!clusterInfo || !entity) return
    const entityId = String(entity.id)

    setBoardEntities((prev) => {
      if (!prev[entityId]) return prev
      const next = { ...prev }
      delete next[entityId]
      return next
    })

    setNodes((prevNodes) => {
      const clusterNode = prevNodes.find((node) => node.id === clusterInfo.id)

      const filteredNodes = prevNodes.filter((node) => {
        if (node.id !== entityId) return true
        if (node.type !== 'entity') return true
        return !node.data?.isAdHoc
      })

      let nextNodes = filteredNodes.map((node) => {
        if (node.id !== clusterInfo.id || node.type !== 'cluster') return node
        const existingPlaced = new Set((node.data?.placedEntityIds || []).map(String))
        if (!existingPlaced.has(entityId)) return node
        existingPlaced.delete(entityId)
        return {
          ...node,
          data: {
            ...node.data,
            placedEntityIds: Array.from(existingPlaced),
          },
        }
      })

      const updatedClusterNode = nextNodes.find(
        (node) => node.id === clusterInfo.id && node.type === 'cluster'
      )
      const remainingPlaced =
        updatedClusterNode?.data?.placedEntityIds?.map((value) => String(value)) || []

      return positionEntitiesBelowCluster(
        nextNodes,
        updatedClusterNode || clusterNode,
        remainingPlaced
      )
    })

    setEdges((prevEdges) => {
      const clusterId = clusterInfo?.id ? String(clusterInfo.id) : null
      if (!clusterId) return prevEdges
      const edgeId = `edge-${clusterId}-${entityId}`
      return prevEdges.filter((edge) => edge.id !== edgeId)
    })
  }, [])

  const handleNodeDragStop = useCallback(
    (event, node) => {
      if (!node || node.type !== 'entity') return
      const entityId = String(node.id)
      const clusterMeta = boardEntities[entityId]
      if (!clusterMeta?.clusterId) return

      const clusterElement = document.querySelector(
        `[data-id="${clusterMeta.clusterId}"]`
      )
      const entityElement = document.querySelector(`[data-id="${entityId}"]`)
      if (!clusterElement || !entityElement) return

      const clusterRect = clusterElement.getBoundingClientRect()
      const entityRect = entityElement.getBoundingClientRect()
      const entityCenterX = entityRect.left + entityRect.width / 2
      const entityCenterY = entityRect.top + entityRect.height / 2

      const isInsideCluster =
        entityCenterX >= clusterRect.left &&
        entityCenterX <= clusterRect.right &&
        entityCenterY >= clusterRect.top &&
        entityCenterY <= clusterRect.bottom

      if (!isInsideCluster) return

      const clusterNode = nodes.find((graphNode) => graphNode.id === clusterMeta.clusterId)
      if (!clusterNode) return

      handleReturnEntityToCluster(
        {
          id: clusterNode.id,
          relationshipType: clusterNode.data?.relationshipType,
          sourceId: clusterNode.data?.sourceId,
          placedEntityIds: clusterNode.data?.placedEntityIds || [],
        },
        {
          id: entityId,
          name: node?.data?.label,
          typeName: node?.data?.typeName,
        }
      )
    },
    [boardEntities, handleReturnEntityToCluster, nodes]
  )

  useEffect(() => {
    setNodes((prevNodes) => {
      const clusterToEntities = Object.entries(boardEntities).reduce((acc, [entity, info]) => {
        const clusterId = info?.clusterId
        if (!clusterId) return acc
        const key = String(clusterId)
        if (!acc[key]) acc[key] = []
        acc[key].push(String(entity))
        return acc
      }, {})

      let nextNodes = prevNodes.map((node) => {
        if (node.type !== 'cluster') return node
        const clusterPlaced = clusterToEntities[node.id] || []
        const existingPlaced = (node.data?.placedEntityIds || []).map((value) => String(value))
        const hasChanged =
          clusterPlaced.length !== existingPlaced.length ||
          clusterPlaced.some((id, index) => id !== existingPlaced[index])

        if (!hasChanged) return node

        return {
          ...node,
          data: {
            ...node.data,
            placedEntityIds: clusterPlaced,
          },
        }
      })

      for (const [clusterId, entityIds] of Object.entries(clusterToEntities)) {
        const clusterNode = nextNodes.find(
          (node) => node.id === clusterId && node.type === 'cluster'
        )
        if (!clusterNode) continue
        nextNodes = positionEntitiesBelowCluster(nextNodes, clusterNode, entityIds)
      }

      return nextNodes
    })
  }, [boardEntities])

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
                  onReturnToGroup: handleReturnEntityToCluster,
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
  }, [entityId, handleAddEntityFromCluster, handleReturnEntityToCluster])

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
            onNodeDragStop={handleNodeDragStop}
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
