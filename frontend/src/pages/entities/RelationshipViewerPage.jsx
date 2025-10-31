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
  const suppressedNodeMetaRef = useRef(new Map())
  const suppressedNodeDefinitionsRef = useRef(new Map())
  const hiddenClusterIdsRef = useRef(new Set())
  const nodesRef = useRef([])
  const edgesRef = useRef([])
  const clustersRef = useRef([])

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

  const markClusterExpanded = useCallback((clusterId) => {
    if (!clusterId) return
    hiddenClusterIdsRef.current.delete(String(clusterId))
  }, [])

  const markClusterCollapsed = useCallback((clusterId) => {
    if (!clusterId) return
    hiddenClusterIdsRef.current.add(String(clusterId))
  }, [])

  const handleAddEntityFromCluster = useCallback(
    (clusterInput) => {
      if (!clusterInput) return

      const clusterId = String(
        typeof clusterInput === 'string'
          ? clusterInput
          : clusterInput?.id ?? clusterInput?.data?.id ?? clusterInput
      )

      if (!clusterId) return

      const clusterNode = nodesRef.current.find(
        (node) => String(node.id) === clusterId && node.type === 'cluster'
      )
      if (!clusterNode) return

      const clustersList = clustersRef.current
      const clusterMeta =
        clustersList.find((cluster) => String(cluster.id) === clusterId) || {
          id: clusterId,
          relationshipType:
            clusterNode?.data?.relationshipType ||
            clusterNode?.data?.label ||
            'Related',
          label:
            clusterNode?.data?.label ||
            clusterNode?.data?.relationshipType ||
            'Related',
          containedIds: (clusterNode?.data?.containedIds || []).map(String),
          parentId:
            clusterNode?.data?.sourceId != null
              ? String(clusterNode.data.sourceId)
              : null,
        }

      const suppressedNodes = suppressedNodesRef.current
      const suppressedDefinitions = suppressedNodeDefinitionsRef.current
      const suppressedMeta = suppressedNodeMetaRef.current

      if (!(suppressedNodes instanceof Map) || !(suppressedDefinitions instanceof Map)) {
        return
      }

      const suppressedIdsToExpand = clusterMeta.containedIds.filter((id) =>
        suppressedNodes.has(String(id))
      )

      if (!suppressedIdsToExpand.length) {
        markClusterExpanded(clusterId)
        return
      }

      const nodesWithDefinitions = suppressedIdsToExpand
        .map((id) => {
          const key = String(id)
          return {
            id: key,
            definition: suppressedDefinitions.get(key),
            meta: suppressedMeta.get(key) || suppressedNodes.get(key) || null,
          }
        })
        .filter((entry) => Boolean(entry.definition))

      if (!nodesWithDefinitions.length) {
        markClusterExpanded(clusterId)
        return
      }

      const relationshipLabel =
        clusterMeta.relationshipType || clusterMeta.label || 'Related'

      const edgesForLayout = [...edgesRef.current]
      const newEdges = []

      nodesWithDefinitions.forEach(({ id, meta }) => {
        const edgeId = `cluster-${clusterId}-${id}`
        if (edgesForLayout.some((edge) => edge.id === edgeId)) return

        const label =
          meta?.relationshipType || relationshipLabel || meta?.entity?.name || 'Related'

        const nextEdge = {
          id: edgeId,
          source: clusterId,
          target: id,
          type: 'smoothstep',
          animated: false,
          label,
          data: {
            relationshipType: label,
            parentId: clusterId,
            childId: id,
            isClusterChildEdge: true,
          },
          sourceHandle: 'bottom',
          targetHandle: 'top',
        }

        edgesForLayout.push(nextEdge)
        newEdges.push(nextEdge)
      })

      nodesWithDefinitions.forEach(({ id }) => {
        suppressedNodes.delete(String(id))
      })

      const remainingHidden = clusterMeta.containedIds.filter((id) =>
        suppressedNodes.has(String(id))
      )

      const visibleIds = clusterMeta.containedIds.filter((id) =>
        !suppressedNodes.has(String(id))
      )

      setBoardEntities((prev) => {
        const next = { ...prev }
        let changed = false
        nodesWithDefinitions.forEach(({ id }) => {
          if (next[id]) return
          next[id] = {
            clusterId: clusterMeta.id,
            relationshipType: clusterMeta.relationshipType || null,
            sourceId: clusterMeta.parentId || null,
          }
          changed = true
        })
        return changed ? next : prev
      })

      if (newEdges.length) {
        setEdges((prevEdges) => {
          const existing = new Set(prevEdges.map((edge) => edge.id))
          const appendable = newEdges.filter((edge) => !existing.has(edge.id))
          if (!appendable.length) return prevEdges
          return [...prevEdges, ...appendable]
        })
      }

      setNodes((prevNodes) => {
        const clusterNodeCurrent = prevNodes.find(
          (node) => String(node.id) === clusterId && node.type === 'cluster'
        )

        if (!clusterNodeCurrent) return prevNodes

        const existingIds = new Set(prevNodes.map((node) => String(node.id)))
        let nextNodes = prevNodes
        let didAddNode = false

        const placedEntityIds = new Set(
          (clusterNodeCurrent.data?.placedEntityIds || []).map((value) => String(value))
        )

        nodesWithDefinitions.forEach(({ id, definition, meta }) => {
          placedEntityIds.add(String(id))
          if (existingIds.has(String(id))) return

          const entityMeta = meta?.entity || {
            id,
            name: definition?.data?.label || `Entity ${id}`,
            typeName:
              definition?.data?.typeName || definition?.data?.type?.name || 'Entity',
            isExpandedProtected: Boolean(definition?.data?.isExpandedProtected),
          }

          const newNode =
            createAdHocEntityNode(
              clusterNodeCurrent,
              entityMeta,
              Array.from(placedEntityIds)
            ) || definition

          if (!newNode) return

          const normalizedNode = {
            ...newNode,
            id: String(id),
            type: 'entity',
            data: {
              ...newNode.data,
              label: entityMeta?.name || newNode.data?.label || `Entity ${id}`,
              typeName:
                entityMeta?.typeName || newNode.data?.typeName || 'Entity',
              entityId: String(id),
              isAdHoc: true,
              onSetTarget: handleSetTargetEntity,
              onOpenInfo: handleOpenEntityInfo,
              isExpandedProtected: Boolean(entityMeta?.isExpandedProtected),
            },
          }

          existingIds.add(String(id))
          didAddNode = true
          nextNodes = [...nextNodes, normalizedNode]
        })

        const orderedPlaced = Array.from(placedEntityIds)
        const updatedLabel = `${relationshipLabel} (${remainingHidden.length})`

        let mappedNodes = nextNodes.map((node) => {
          if (String(node.id) !== clusterId || node.type !== 'cluster') return node
          return {
            ...node,
            data: {
              ...node.data,
              placedEntityIds: orderedPlaced,
              label: updatedLabel,
            },
          }
        })

        const clusterForPlacement =
          mappedNodes.find(
            (node) => String(node.id) === clusterId && node.type === 'cluster'
          ) || clusterNodeCurrent

        mappedNodes = positionEntitiesBelowCluster(
          mappedNodes,
          clusterForPlacement,
          orderedPlaced
        )

        if (!didAddNode) {
          const hasLabelChange = prevNodes.some((node) => {
            if (String(node.id) !== clusterId || node.type !== 'cluster') return false
            return node.data?.label !== updatedLabel
          })

          if (!hasLabelChange) return prevNodes
        }

        return layoutNodesHierarchically(mappedNodes, edgesForLayout)
      })

      const normalizedLabel = `${relationshipLabel} (${remainingHidden.length})`
      clusterMeta.label = normalizedLabel
      clustersRef.current = clustersRef.current.map((cluster) =>
        String(cluster.id) === clusterId
          ? { ...cluster, label: normalizedLabel }
          : cluster
      )

      markClusterExpanded(clusterId)
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

    const isProtectedNode = nodesRef.current.some(
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
    const suppressedMeta = {
      clusterId,
      parentId: clusterInfo.sourceId ? String(clusterInfo.sourceId) : null,
      relationshipType: relationshipLabel,
      entity: {
        id: entityId,
        name: entity?.name || `Entity ${entityId}`,
        typeName: entity?.typeName || entity?.type?.name || 'Entity',
        type: entity?.type,
      },
    }

    suppressedNodesRef.current.set(entityId, suppressedMeta)
    suppressedNodeMetaRef.current.set(entityId, suppressedMeta)
    suppressedNodeDefinitionsRef.current.set(entityId, {
      id: entityId,
      type: 'entity',
      position: { x: 0, y: 0 },
      data: {
        label: entity?.name || `Entity ${entityId}`,
        typeName: entity?.typeName || entity?.type?.name || 'Entity',
        entityId,
        isAdHoc: true,
        isExpandedProtected: Boolean(entity?.isExpandedProtected),
      },
    })

    const clusterRecord = clustersRef.current.find((cluster) => cluster.id === clusterId)
    if (clusterRecord) {
      const remainingHidden = clusterInfo.containedIds.filter((id) =>
        suppressedNodesRef.current.has(String(id))
      )
      const updatedLabel = `${
        clusterRecord.relationshipType || clusterInfo.relationshipType || 'Related'
      } (${remainingHidden.length})`
      clusterRecord.label = updatedLabel
      clustersRef.current = clustersRef.current.map((cluster) =>
        cluster.id === clusterId ? { ...cluster, label: updatedLabel } : cluster
      )
      setNodes((prevNodes) =>
        prevNodes.map((node) => {
          if (String(node.id) !== clusterId || node.type !== 'cluster') return node
          return {
            ...node,
            data: {
              ...node.data,
              label: updatedLabel,
            },
          }
        })
      )
    }

    if (finalRemainingPlaced.length) {
      markClusterExpanded(clusterId)
    } else {
      markClusterCollapsed(clusterId)
    }
  }, [markClusterCollapsed, markClusterExpanded])

  const handleCollapseEntityToCluster = useCallback(
    (clusterInput) => {
      if (!clusterInput) return

      const clusterId = String(
        typeof clusterInput === 'string'
          ? clusterInput
          : clusterInput?.id ?? clusterInput?.data?.id ?? clusterInput
      )
      if (!clusterId) return

      const clusterMeta = clustersRef.current.find(
        (cluster) => String(cluster.id) === clusterId
      )
      if (!clusterMeta) return

      const suppressedNodes = suppressedNodesRef.current
      const suppressedMeta = suppressedNodeMetaRef.current

      const entitiesToCollapse = clusterMeta.containedIds.filter((id) =>
        nodesRef.current.some((node) => String(node.id) === String(id))
      )

      if (!entitiesToCollapse.length) {
        markClusterCollapsed(clusterId)
        return
      }

      entitiesToCollapse.forEach((entityId) => {
        const key = String(entityId)
        const node = nodesRef.current.find((graphNode) => String(graphNode.id) === key)
        if (node?.type === 'entity') {
          suppressedNodeDefinitionsRef.current.set(key, {
            id: key,
            type: 'entity',
            position: { x: 0, y: 0 },
            data: {
              label: node.data?.label || `Entity ${key}`,
              typeName: node.data?.typeName || 'Entity',
              entityId: key,
              isAdHoc: true,
              isExpandedProtected: Boolean(node.data?.isExpandedProtected),
            },
          })
        }

        const meta = suppressedMeta.get(key) || {
          clusterId,
          parentId: clusterMeta.parentId || null,
          relationshipType: clusterMeta.relationshipType || clusterMeta.label || 'Related',
          entity:
            node?.data
              ? {
                  id: key,
                  name: node.data?.label || `Entity ${key}`,
                  typeName: node.data?.typeName || 'Entity',
                  isExpandedProtected: Boolean(node.data?.isExpandedProtected),
                }
              : suppressedNodeDefinitionsRef.current.get(key)?.data
              ? {
                  id: key,
                  name:
                    suppressedNodeDefinitionsRef.current.get(key)?.data?.label ||
                    `Entity ${key}`,
                  typeName:
                    suppressedNodeDefinitionsRef.current.get(key)?.data?.typeName || 'Entity',
                  isExpandedProtected: Boolean(
                    suppressedNodeDefinitionsRef.current.get(key)?.data?.isExpandedProtected
                  ),
                }
              : null,
        }
        suppressedNodes.set(key, meta)
        suppressedMeta.set(key, meta)
      })

      const filteredEdges = edgesRef.current.filter((edge) => {
        const sourceId = String(edge.source)
        const targetId = String(edge.target)
        return (
          !entitiesToCollapse.includes(sourceId) && !entitiesToCollapse.includes(targetId)
        )
      })

      setEdges(filteredEdges)

      setBoardEntities((prev) => {
        const next = { ...prev }
        let changed = false
        entitiesToCollapse.forEach((id) => {
          if (next[id]) {
            delete next[id]
            changed = true
          }
        })
        return changed ? next : prev
      })

      const remainingHidden = clusterMeta.containedIds.filter((id) =>
        suppressedNodes.has(String(id))
      )
      const updatedLabel = `${
        clusterMeta.relationshipType || clusterMeta.label || 'Related'
      } (${remainingHidden.length})`
      clusterMeta.label = updatedLabel
      clustersRef.current = clustersRef.current.map((cluster) =>
        String(cluster.id) === clusterId ? { ...cluster, label: updatedLabel } : cluster
      )

      setNodes((prev) => {
        const filteredNodes = prev.filter(
          (node) => !entitiesToCollapse.includes(String(node.id))
        )

        const mappedNodes = filteredNodes.map((node) => {
          if (String(node.id) !== clusterId || node.type !== 'cluster') return node
          return {
            ...node,
            data: {
              ...node.data,
              placedEntityIds: clusterMeta.containedIds.filter((id) =>
                !suppressedNodes.has(String(id))
              ),
              label: updatedLabel,
            },
          }
        })

        return layoutNodesHierarchically(mappedNodes, filteredEdges)
      })

      markClusterCollapsed(clusterId)
    },
    [markClusterCollapsed]
  )

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

        const {
          nodes: layoutedNodes,
          edges: layoutedEdges,
          suppressedNodes: layoutedSuppressedNodes,
          clusters: layoutedClusters,
        } = buildReactFlowGraph({ ...graphData, edges: sanitizedEdges }, entityId)
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
                  onCollapseCluster: handleCollapseEntityToCluster,
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

          const decoratedNodes = layoutedNodes.map(decorateNode)
          const suppressedMap = new Map()
          const rawSuppressed = layoutedSuppressedNodes

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
          suppressedNodeMetaRef.current = new Map(suppressedMap)

          const suppressedDefinitions = new Map()
          suppressedMap.forEach((info, key) => {
            const id = String(key)
            const entity = info?.entity || null
            suppressedDefinitions.set(id, {
              id,
              type: 'entity',
              position: { x: 0, y: 0 },
              data: {
                label: entity?.name || `Entity ${id}`,
                typeName: entity?.typeName || entity?.type?.name || 'Entity',
                entityId: id,
                isAdHoc: true,
                isExpandedProtected: Boolean(entity?.isExpandedProtected),
              },
            })
          })

          suppressedNodeDefinitionsRef.current = suppressedDefinitions

          const initialHidden = new Set()
          const clusterSource = Array.isArray(layoutedClusters)
            ? layoutedClusters
            : decoratedNodes.filter((node) => node.type === 'cluster')
          clusterSource.forEach((clusterNode) => {
            initialHidden.add(String(clusterNode.id))
          })
          hiddenClusterIdsRef.current = initialHidden

          const normalizedClusters = clusterSource.map((clusterNode) => ({
            id: String(clusterNode.id),
            relationshipType:
              clusterNode?.data?.relationshipType ||
              clusterNode?.data?.label ||
              'Related',
            label:
              clusterNode?.data?.label ||
              clusterNode?.data?.relationshipType ||
              'Related',
            containedIds: (clusterNode?.data?.containedIds || []).map((value) =>
              String(value)
            ),
            parentId:
              clusterNode?.data?.sourceId != null
                ? String(clusterNode.data.sourceId)
                : null,
          }))

          clustersRef.current = normalizedClusters

          setNodes(decoratedNodes)
          setEdges(layoutedEdges)
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
    handleCollapseEntityToCluster,
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
