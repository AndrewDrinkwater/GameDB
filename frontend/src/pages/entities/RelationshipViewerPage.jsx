import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ReactFlow, { Background, Controls, MiniMap, applyEdgeChanges, applyNodeChanges } from 'reactflow'
import 'reactflow/dist/style.css'
import { getEntityGraph } from '../../api/entities.js'
import ClusterNode from '../../components/nodes/ClusterNode.jsx'
import EntityNode from '../../components/nodes/EntityNode.jsx'
import {
  buildReactFlowGraph,
  createAdHocEntityNode,
  positionEntitiesBelowCluster,
} from '../../utils/entityPositioning.js'
import RelationshipToolbar from '../../components/relationshipViewer/RelationshipToolbar.jsx'

const nodeTypes = { cluster: ClusterNode, entity: EntityNode }
const edgeTypes = {}

export default function RelationshipViewerPage() {
  const { entityId } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])
  const [boardEntities, setBoardEntities] = useState({})
  const [reactFlowInstance, setReactFlowInstance] = useState(null)
  const [relationshipDepth, setRelationshipDepth] = useState(1)

  const onNodesChange = useCallback((changes) => setNodes((n) => applyNodeChanges(changes, n)), [])
  const onEdgesChange = useCallback((changes) => setEdges((e) => applyEdgeChanges(changes, e)), [])

  const handleSetTargetEntity = useCallback(
    (nextEntityId) => {
      if (!nextEntityId) return
      navigate(`/entities/${nextEntityId}/relationship-viewer`)
    },
    [navigate]
  )

  const handleOpenEntityInfo = useCallback((entityToOpen) => {
    if (!entityToOpen) return
    const url = `/entities/${entityToOpen}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }, [])

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
          const newNode = createAdHocEntityNode(clusterNode, entity)
          nextNodes =
            newNode
              ? [
                  ...prevNodes,
                  {
                    ...newNode,
                    data: {
                      ...newNode.data,
                      onSetTarget: handleSetTargetEntity,
                      onOpenInfo: handleOpenEntityInfo,
                    },
                  },
                ]
              : prevNodes
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
    [handleOpenEntityInfo, handleSetTargetEntity]
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
        const graph = await getEntityGraph(entityId, relationshipDepth)
        const layouted = buildReactFlowGraph(graph, entityId)
        if (active) {
          const decoratedNodes = layouted.nodes.map((node) => {
            if (node.type === 'cluster') {
              return {
                ...node,
                data: {
                  ...node.data,
                  onAddToBoard: handleAddEntityFromCluster,
                  onReturnToGroup: handleReturnEntityToCluster,
                  onSetTargetEntity: handleSetTargetEntity,
                  onOpenEntityInfo: handleOpenEntityInfo,
                  placedEntityIds: [],
                },
              }
            }

            if (node.type === 'entity') {
              return {
                ...node,
                data: {
                  ...node.data,
                  onSetTarget: handleSetTargetEntity,
                  onOpenInfo: handleOpenEntityInfo,
                },
              }
            }

            return node
          })

          setNodes(decoratedNodes)
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
  }, [
    entityId,
    relationshipDepth,
    handleAddEntityFromCluster,
    handleOpenEntityInfo,
    handleReturnEntityToCluster,
    handleSetTargetEntity,
  ])

  const handleRefocusView = useCallback(() => {
    if (!reactFlowInstance || !entityId) return
    const centerId = String(entityId)
    const centerNode = reactFlowInstance.getNode(centerId)
    if (!centerNode) return

    const nodeWidth = centerNode.width ?? 0
    const nodeHeight = centerNode.height ?? 0
    const x = centerNode.position.x + nodeWidth / 2
    const y = centerNode.position.y + nodeHeight / 2

    reactFlowInstance.setCenter(x, y, {
      zoom: Math.max(1, reactFlowInstance.getZoom()),
      duration: 500,
    })
  }, [entityId, reactFlowInstance])

  const handleZoomToFit = useCallback(() => {
    if (!reactFlowInstance || !nodes.length) return
    reactFlowInstance.fitView({ padding: 0.2, duration: 500 })
  }, [nodes.length, reactFlowInstance])

  const handleIncreaseDepth = useCallback(() => {
    setRelationshipDepth((current) => Math.min(3, current + 1))
  }, [])

  const handleDecreaseDepth = useCallback(() => {
    setRelationshipDepth((current) => Math.max(1, current - 1))
  }, [])

  if (loading) return <p className="p-4">Loading graph...</p>
  if (error) return <p className="p-4 text-red-500">Error: {error}</p>
  if (!nodes.length) return <p className="p-4">No relationships found for this entity.</p>

  return (
    <div className="flex flex-col h-screen w-full bg-gray-100">
      <header className="p-4 border-b bg-white shadow-sm">
        <h1 className="text-2xl font-bold text-gray-800">Relationship Explorer</h1>
      </header>

      <div className="flex-1 min-h-0 flex flex-col bg-slate-100">
        <RelationshipToolbar
          onRefocus={handleRefocusView}
          onZoomToFit={handleZoomToFit}
          depth={relationshipDepth}
          onIncreaseDepth={handleIncreaseDepth}
          onDecreaseDepth={handleDecreaseDepth}
        />

        {/* IMPORTANT: This wrapper ensures React Flow receives explicit dimensions. Removing it breaks the canvas. */}
        <div className="flex-1 min-h-0 relative">
          <div className="w-full h-full relative" style={{ height: 'calc(100vh - 80px)' }}>
            {/* IMPORTANT: Do not remove the wrapper above or the canvas will disappear. */}
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeDragStop={handleNodeDragStop}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              fitView
              onInit={setReactFlowInstance}
            >
              <MiniMap />
              <Controls />
              <Background gap={16} />
            </ReactFlow>
          </div>
        </div>
      </div>
    </div>
  )
}
