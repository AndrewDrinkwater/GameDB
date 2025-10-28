import { useCallback, useEffect, useRef, useState } from 'react'
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
  layoutNodesHierarchically,
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
  const suppressedNodesRef = useRef(new Map())
  const hiddenClusterIdsRef = useRef(new Set())

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

  const markClusterExpanded = useCallback((clusterId) => {
    if (!clusterId) return
    hiddenClusterIdsRef.current.delete(String(clusterId))
  }, [])

  const markClusterCollapsed = useCallback((clusterId) => {
    if (!clusterId) return
    hiddenClusterIdsRef.current.add(String(clusterId))
  }, [])

  const handleAddEntityFromCluster = useCallback(
    (clusterInfo, entity) => {
      if (!clusterInfo || !entity) return

      const entityId = String(entity.id)
      const clusterId = String(clusterInfo.id)

      if (entity?.isExpandedProtected) {
        return
      }

      const suppressedNodes = suppressedNodesRef.current
      if (suppressedNodes.has(entityId)) {
        suppressedNodes.delete(entityId)
      } else {
        return
      }

      markClusterExpanded(clusterId)

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
          const newNode = createAdHocEntityNode(clusterNode, entity, placedWithNew)
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
        const edgeId = `cluster-${clusterId}-${entityId}`
        if (prevEdges.some((edge) => edge.id === edgeId)) return prevEdges

        const relationshipLabel =
          clusterInfo.relationshipType || clusterInfo.label || 'Related'

        return [
          ...prevEdges,
          {
            id: edgeId,
            source: clusterId,
            target: entityId,
            type: 'smoothstep',
            animated: false,
            label: relationshipLabel,
            data: {
              relationshipType: relationshipLabel,
              parentId: clusterId,
              childId: entityId,
              isClusterChildEdge: true,
            },
            sourceHandle: 'bottom',
            targetHandle: 'top',
          },
        ]
      })
    },
    [handleOpenEntityInfo, handleSetTargetEntity, markClusterExpanded]
  )

  const handleReturnEntityToCluster = useCallback((clusterInfo, entity) => {
    if (!clusterInfo || !entity) return
    const entityId = String(entity.id)
    const clusterId = String(clusterInfo.id)

    if (entity?.isExpandedProtected) {
      return
    }

    const isProtectedNode = nodes.some(
      (graphNode) =>
        String(graphNode?.id) === entityId && graphNode?.data?.isExpandedProtected
    )
    if (isProtectedNode) return

    setBoardEntities((prev) => {
      if (!prev[entityId]) return prev
      const next = { ...prev }
      delete next[entityId]
      return next
    })

    let finalRemainingPlaced = []

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

      finalRemainingPlaced = remainingPlaced

      return positionEntitiesBelowCluster(
        nextNodes,
        updatedClusterNode || clusterNode,
        remainingPlaced
      )
    })

    setEdges((prevEdges) =>
      prevEdges.filter((edge) => edge.source !== entityId && edge.target !== entityId)
    )

    const relationshipLabel = clusterInfo.relationshipType || clusterInfo.label || 'Related'
    suppressedNodesRef.current.set(entityId, {
      clusterId,
      parentId: clusterInfo.sourceId ? String(clusterInfo.sourceId) : null,
      relationshipType: relationshipLabel,
      entity: {
        id: entityId,
        name: entity?.name || `Entity ${entityId}`,
        typeName: entity?.typeName || entity?.type?.name || 'Entity',
        type: entity?.type,
      },
    })

    if (finalRemainingPlaced.length) {
      markClusterExpanded(clusterId)
    } else {
      markClusterCollapsed(clusterId)
    }
  }, [markClusterCollapsed, markClusterExpanded, nodes])

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

      if (node?.data?.isExpandedProtected) return

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
          isExpandedProtected: Boolean(node?.data?.isExpandedProtected),
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
        const suppressedEntries =
          suppressedNodesRef.current instanceof Map
            ? Array.from(suppressedNodesRef.current.entries())
            : []
        const suppressedLookup = new Map(
          suppressedEntries.map(([key, value]) => [String(key), value])
        )
        const suppressedIds = new Set(suppressedLookup.keys())

        const graph = await getEntityGraph(entityId, relationshipDepth)
        const graphData = graph ?? {}

        let sanitizedEdges = Array.isArray(graphData.edges) ? graphData.edges : []
        if (suppressedIds.size && Array.isArray(graphData.edges)) {
          sanitizedEdges = graphData.edges.filter((edge) => {
            const fromRaw =
              edge?.from_entity ??
              edge?.fromEntityId ??
              edge?.from ??
              edge?.source ??
              edge?.sourceId ??
              null
            const toRaw =
              edge?.to_entity ??
              edge?.toEntityId ??
              edge?.to ??
              edge?.target ??
              edge?.targetId ??
              null

            const fromId = fromRaw != null ? String(fromRaw) : null
            const toId = toRaw != null ? String(toRaw) : null

            const fromSuppressed = fromId ? suppressedIds.has(fromId) : false
            const toSuppressed = toId ? suppressedIds.has(toId) : false

            if (!fromSuppressed && !toSuppressed) return true
            if (fromSuppressed && toSuppressed) return false

            if (fromSuppressed) {
              const meta = suppressedLookup.get(fromId)
              const parentId = meta?.parentId != null ? String(meta.parentId) : null
              return parentId && parentId === toId
            }

            if (toSuppressed) {
              const meta = suppressedLookup.get(toId)
              const parentId = meta?.parentId != null ? String(meta.parentId) : null
              return parentId && parentId === fromId
            }

            return true
          })
        }

        const layouted = buildReactFlowGraph(
          { ...graphData, edges: sanitizedEdges },
          entityId
        )
        if (active) {
          const decorateNode = (node) => {
            if (!node) return null
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

            return { ...node }
          }

          const decoratedNodes = layouted.nodes.map(decorateNode)
          const suppressedMap = new Map()
          const rawSuppressed = layouted.suppressedNodes

          if (rawSuppressed instanceof Map) {
            rawSuppressed.forEach((info, key) => {
              const id = String(key)
              suppressedMap.set(id, {
                clusterId: info?.clusterId != null ? String(info.clusterId) : null,
                parentId: info?.parentId != null ? String(info.parentId) : null,
                relationshipType: info?.relationshipType || 'Related',
                entity: info?.entity
                  ? {
                      ...info.entity,
                      id: String(info.entity.id ?? id),
                      name: info.entity?.name || `Entity ${id}`,
                      typeName:
                        info.entity?.typeName || info.entity?.type?.name || 'Entity',
                      isExpandedProtected: Boolean(info.entity?.isExpandedProtected),
                    }
                  : null,
              })
            })
          } else {
            Object.entries(rawSuppressed || {}).forEach(([key, info]) => {
              const id = String(key)
              suppressedMap.set(id, {
                clusterId: info?.clusterId != null ? String(info.clusterId) : null,
                parentId: info?.parentId != null ? String(info.parentId) : null,
                relationshipType: info?.relationshipType || 'Related',
                entity: info?.entity
                  ? {
                      ...info.entity,
                      id: String(info.entity.id ?? id),
                      name: info.entity?.name || `Entity ${id}`,
                      typeName:
                        info.entity?.typeName || info.entity?.type?.name || 'Entity',
                      isExpandedProtected: Boolean(info.entity?.isExpandedProtected),
                    }
                  : null,
              })
            })
          }

          suppressedNodesRef.current = suppressedMap

          const initialHidden = new Set()
          decoratedNodes.forEach((node) => {
            if (node.type === 'cluster') {
              initialHidden.add(String(node.id))
            }
          })
          hiddenClusterIdsRef.current = initialHidden

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

  const handleAutoArrange = useCallback(() => {
    if (!entityId) return

    setNodes((currentNodes) => {
      if (!currentNodes?.length) return currentNodes

      const layouted = layoutNodesHierarchically(currentNodes, edges, entityId)

      const positionMap = new Map(
        layouted.map((node) => [String(node.id), { ...node.position }])
      )

      const withPositions = currentNodes.map((node) => {
        const layoutPosition = positionMap.get(String(node.id))
        if (!layoutPosition) return node

        const hasSamePosition =
          node?.position?.x === layoutPosition.x &&
          node?.position?.y === layoutPosition.y

        if (hasSamePosition) return node

        return {
          ...node,
          position: { ...layoutPosition },
        }
      })

      const clusterToEntities = Object.entries(boardEntities).reduce(
        (acc, [entityKey, info]) => {
          const clusterId = info?.clusterId
          if (!clusterId) return acc
          const key = String(clusterId)
          if (!acc[key]) acc[key] = []
          acc[key].push(String(entityKey))
          return acc
        },
        {}
      )

      if (!Object.keys(clusterToEntities).length) return withPositions

      let arrangedNodes = withPositions.map((node) => {
        if (node.type !== 'cluster') return node
        const placed = clusterToEntities[node.id] || []
        const existingPlaced = (node.data?.placedEntityIds || []).map(String)

        const changed =
          placed.length !== existingPlaced.length ||
          placed.some((id, index) => id !== existingPlaced[index])

        if (!changed) return node

        return {
          ...node,
          data: {
            ...node.data,
            placedEntityIds: placed,
          },
        }
      })

      for (const [clusterId, entityIds] of Object.entries(clusterToEntities)) {
        const clusterNode = arrangedNodes.find(
          (node) => node.id === clusterId && node.type === 'cluster'
        )
        if (!clusterNode) continue
        arrangedNodes = positionEntitiesBelowCluster(
          arrangedNodes,
          clusterNode,
          entityIds
        )
      }

      return arrangedNodes
    })

    if (reactFlowInstance) {
      requestAnimationFrame(() => {
        reactFlowInstance.fitView({ padding: 0.2, duration: 400 })
      })
    }
  }, [boardEntities, edges, entityId, reactFlowInstance])

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
          onAutoArrange={handleAutoArrange}
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
