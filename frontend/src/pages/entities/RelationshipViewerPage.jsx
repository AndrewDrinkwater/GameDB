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
  const [, setSuppressedNodesState] = useState({})
  const suppressedNodesRef = useRef({})
  const [, setSuppressedEdgesState] = useState([])
  const suppressedEdgesRef = useRef([])
  const nodeSuppressedByRef = useRef({})
  const hiddenClusterIdsRef = useRef(new Set())
  const [hiddenVersion, setHiddenVersion] = useState(0)
  const nodesRef = useRef(nodes)
  const edgesRef = useRef(edges)

  useEffect(() => {
    nodesRef.current = nodes
  }, [nodes])

  useEffect(() => {
    edgesRef.current = edges
  }, [edges])

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

  const markEntityVisible = useCallback((entityId) => {
    if (!entityId) return
    const normalizedId = String(entityId)
    const hiddenSet = hiddenClusterIdsRef.current
    if (hiddenSet.delete(normalizedId)) {
      hiddenClusterIdsRef.current = hiddenSet
      setHiddenVersion((version) => version + 1)
    }
  }, [])

  const markEntityHidden = useCallback((entityId) => {
    if (!entityId) return
    const normalizedId = String(entityId)
    const hiddenSet = hiddenClusterIdsRef.current
    if (!hiddenSet.has(normalizedId)) {
      hiddenSet.add(normalizedId)
      hiddenClusterIdsRef.current = hiddenSet
      setHiddenVersion((version) => version + 1)
    }
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

      markEntityVisible(entityId)
    },
    [handleOpenEntityInfo, handleSetTargetEntity, markEntityVisible]
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

    setEdges((prevEdges) =>
      prevEdges.filter((edge) => edge.source !== entityId && edge.target !== entityId)
    )

    markEntityHidden(entityId)
  }, [markEntityHidden])

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

  const releaseSuppressedNodes = useCallback(() => {
    const suppressed = suppressedNodesRef.current
    if (!suppressed || !Object.keys(suppressed).length) return
    const hiddenSet = hiddenClusterIdsRef.current
    const blockersMap = nodeSuppressedByRef.current || {}
    const toRelease = []

    for (const [nodeId, blockers] of Object.entries(blockersMap)) {
      if (!suppressed[nodeId]) continue
      const stillHidden = blockers.some((hiddenId) => hiddenSet.has(hiddenId))
      if (!stillHidden) toRelease.push(nodeId)
    }

    if (!toRelease.length) return

    const nextSuppressed = { ...suppressed }
    const nodesToAdd = []

    toRelease.forEach((nodeId) => {
      const node = nextSuppressed[nodeId]
      if (node) {
        nodesToAdd.push(node)
        delete nextSuppressed[nodeId]
        hiddenSet.delete(nodeId)
      }
    })

    suppressedNodesRef.current = nextSuppressed
    setSuppressedNodesState(nextSuppressed)

    if (nodesToAdd.length) {
      setNodes((prevNodes) => {
        const existingIds = new Set(prevNodes.map((node) => node.id))
        const additions = nodesToAdd.filter((node) => !existingIds.has(node.id))
        if (!additions.length) return prevNodes
        return [...prevNodes, ...additions]
      })
    }
  }, [])

  const enforceSuppressionForHidden = useCallback(() => {
    const blockersMap = nodeSuppressedByRef.current || {}
    const hiddenSet = hiddenClusterIdsRef.current
    if (!hiddenSet.size) return

    const currentNodes = nodesRef.current || []
    const currentSuppressed = { ...suppressedNodesRef.current }
    const nodesToSuppress = []

    currentNodes.forEach((node) => {
      const blockers = blockersMap[node.id]
      if (!blockers?.length) return
      const shouldSuppress = blockers.some((hiddenId) => hiddenSet.has(hiddenId))
      if (shouldSuppress) nodesToSuppress.push(node.id)
    })

    if (!nodesToSuppress.length) return

    const remainingNodes = currentNodes.filter((node) => {
      if (nodesToSuppress.includes(node.id)) {
        currentSuppressed[node.id] = node
        return false
      }
      return true
    })

    suppressedNodesRef.current = currentSuppressed
    setSuppressedNodesState(currentSuppressed)
    setNodes(remainingNodes)

    const currentEdges = edgesRef.current || []
    const nextEdges = []
    const suppressedList = [...suppressedEdgesRef.current]

    currentEdges.forEach((edge) => {
      if (nodesToSuppress.includes(edge.source) || nodesToSuppress.includes(edge.target)) {
        suppressedList.push(edge)
      } else {
        nextEdges.push(edge)
      }
    })

    suppressedEdgesRef.current = suppressedList
    setSuppressedEdgesState(suppressedList)
    setEdges(nextEdges)
  }, [])

  useEffect(() => {
    if (!hiddenVersion) return
    releaseSuppressedNodes()
    enforceSuppressionForHidden()
  }, [hiddenVersion, enforceSuppressionForHidden, releaseSuppressedNodes])

  useEffect(() => {
    if (!suppressedEdgesRef.current.length) return
    const visibleIds = new Set(nodes.map((node) => node.id))
    const toAdd = []
    const remaining = []

    suppressedEdgesRef.current.forEach((edge) => {
      const sourceVisible = visibleIds.has(edge.source)
      const targetVisible = visibleIds.has(edge.target)
      if (sourceVisible && targetVisible) {
        toAdd.push(edge)
      } else {
        remaining.push(edge)
      }
    })

    if (!toAdd.length) {
      if (remaining.length !== suppressedEdgesRef.current.length) {
        suppressedEdgesRef.current = remaining
        setSuppressedEdgesState(remaining)
      }
      return
    }

    setEdges((prevEdges) => {
      const existingIds = new Set(prevEdges.map((edge) => edge.id))
      const additions = toAdd.filter((edge) => !existingIds.has(edge.id))
      if (!additions.length) return prevEdges
      return [...prevEdges, ...additions]
    })

    suppressedEdgesRef.current = remaining
    setSuppressedEdgesState(remaining)
  }, [nodes])

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
          const decoratedSuppressedNodes = Object.fromEntries(
            Object.entries(layouted.suppressedNodes || {}).map(([id, node]) => [id, decorateNode(node)])
          )

          suppressedNodesRef.current = decoratedSuppressedNodes
          setSuppressedNodesState(decoratedSuppressedNodes)

          suppressedEdgesRef.current = layouted.suppressedEdges || []
          setSuppressedEdgesState(layouted.suppressedEdges || [])

          nodeSuppressedByRef.current = layouted.nodeSuppressedBy || {}

          hiddenClusterIdsRef.current = new Set((layouted.hiddenNodeIds || []).map(String))
          setHiddenVersion((version) => version + 1)

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

      const layouted = layoutNodesHierarchically(
        currentNodes,
        edgesRef.current || [],
        entityId
      )

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
  }, [boardEntities, entityId, reactFlowInstance])

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
