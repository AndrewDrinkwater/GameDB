import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ReactFlow, { Background, Controls, MiniMap, applyEdgeChanges, applyNodeChanges } from 'reactflow'
import 'reactflow/dist/style.css'
import { getEntityGraph, getEntity } from '../../api/entities.js'
import ClusterNode from '../../components/nodes/ClusterNode.jsx'
import EntityNode from '../../components/nodes/EntityNode.jsx'
import {
  buildReactFlowGraph,
  createAdHocEntityNode,
  positionEntitiesBelowCluster,
  layoutNodesHierarchically,
  normalizeGraphEdge,
  sanitizeEntityLabel,
} from '../../utils/entityPositioning.js'
import RelationshipToolbar from '../../components/relationshipViewer/RelationshipToolbar.jsx'
import EntityInfoDrawer from '../../components/relationshipViewer/EntityInfoDrawer.jsx'

const nodeTypes = { cluster: ClusterNode, entity: EntityNode }
const edgeTypes = {}

const DEFAULT_RELATIONSHIP_LABEL = 'Related'

function buildAdjacencyFromEdges(edges) {
  const adjacency = new Map()
  if (!Array.isArray(edges)) return adjacency

  edges.forEach((edge) => {
    if (!edge) return

    const parentRaw =
      edge?.parentId != null
        ? edge.parentId
        : edge?.source != null
        ? edge.source
        : null
    const childRaw =
      edge?.childId != null
        ? edge.childId
        : edge?.target != null
        ? edge.target
        : null

    if (parentRaw == null || childRaw == null) return

    const parentId = String(parentRaw)
    const childId = String(childRaw)
    if (!parentId || !childId || parentId === childId) return

    if (!adjacency.has(parentId)) adjacency.set(parentId, [])
    adjacency.get(parentId).push(edge)
  })

  return adjacency
}

function computeDepthLookup(sourceId, adjacency) {
  const depthMap = new Map()
  if (!sourceId) return depthMap

  const normalizedSource = String(sourceId)
  if (!normalizedSource) return depthMap

  depthMap.set(normalizedSource, 0)
  const queue = [normalizedSource]
  const visited = new Set([normalizedSource])

  while (queue.length) {
    const currentId = queue.shift()
    if (!currentId) continue

    const currentDepth = depthMap.get(currentId) ?? 0
    const outgoing = adjacency.get(currentId)
    if (!outgoing || !outgoing.length) continue

    outgoing.forEach((edge) => {
      if (!edge) return

      const childRaw =
        edge?.childId != null
          ? edge.childId
          : edge?.target != null
          ? edge.target
          : null

      const childId = childRaw != null ? String(childRaw) : null
      if (!childId || visited.has(childId) || childId === currentId) return

      depthMap.set(childId, currentDepth + 1)
      visited.add(childId)
      queue.push(childId)
    })
  }

  return depthMap
}

function buildParentChainLookup(edges) {
  const lookup = new Map()
  if (!Array.isArray(edges)) return lookup

  edges.forEach((edge) => {
    if (!edge) return

    const parentRaw =
      edge?.parentId != null
        ? edge.parentId
        : edge?.source != null
        ? edge.source
        : null
    const childRaw =
      edge?.childId != null
        ? edge.childId
        : edge?.target != null
        ? edge.target
        : null

    if (parentRaw == null || childRaw == null) return

    const parentId = String(parentRaw)
    const childId = String(childRaw)
    if (!parentId || !childId || parentId === childId) return

    if (!lookup.has(childId)) lookup.set(childId, new Set())
    lookup.get(childId).add(parentId)
  })

  return lookup
}

function computeAncestorInclusionSet(sourceId, edges, depthLimit = null) {
  const normalizedSource = sourceId != null ? String(sourceId) : null
  if (!normalizedSource) return new Set()

  const parentLookup = buildParentChainLookup(edges)
  if (!parentLookup.size) return new Set()

  const ancestors = new Set()
  const queue = []
  const depthMap = new Map()

  const directParents = parentLookup.get(normalizedSource)
  if (directParents && directParents.size) {
    directParents.forEach((parentId) => {
      const normalizedParent = String(parentId)
      if (!normalizedParent) return
      ancestors.add(normalizedParent)
      queue.push(normalizedParent)
      depthMap.set(normalizedParent, 1)
    })
  }

  while (queue.length) {
    const currentId = queue.shift()
    if (!currentId) continue

    const currentDepth = depthMap.get(currentId) ?? 1
    if (depthLimit != null && currentDepth >= depthLimit) {
      continue
    }

    const parents = parentLookup.get(currentId)
    if (!parents || !parents.size) continue

    parents.forEach((parentId) => {
      const normalizedParent = String(parentId)
      if (!normalizedParent || normalizedParent === currentId) return
      if (ancestors.has(normalizedParent)) return

      const nextDepth = currentDepth + 1
      if (depthLimit != null && nextDepth > depthLimit) return

      ancestors.add(normalizedParent)
      depthMap.set(normalizedParent, nextDepth)
      queue.push(normalizedParent)
    })
  }

  return ancestors
}

function convertNormalizedEdgeToReactFlow(edge) {
  if (!edge) return null

  const sourceRaw =
    edge?.parentId != null
      ? edge.parentId
      : edge?.source != null
      ? edge.source
      : null
  const targetRaw =
    edge?.childId != null
      ? edge.childId
      : edge?.target != null
      ? edge.target
      : null

  const source = sourceRaw != null ? String(sourceRaw) : null
  const target = targetRaw != null ? String(targetRaw) : null

  if (!source || !target || source === target) return null

  const label =
    edge?.relationshipLabel ||
    edge?.label ||
    edge?.typeName ||
    DEFAULT_RELATIONSHIP_LABEL

  return {
    id:
      edge?.id != null && edge.id !== ''
        ? String(edge.id)
        : `edge-${source}-${target}`,
    source,
    target,
    type: 'smoothstep',
    animated: edge?.isClusterEdge ? false : true,
    label,
    data: {
      relationshipType: label,
      parentId: source,
      childId: target,
      isClusterEdge: Boolean(edge?.isClusterEdge),
    },
    parentId: source,
    childId: target,
    sourceHandle: 'bottom',
    targetHandle: 'top',
  }
}

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
  const [selectedEntityInfoId, setSelectedEntityInfoId] = useState(null)
  const [selectedEntityInfo, setSelectedEntityInfo] = useState(null)
  const [selectedEntityInfoError, setSelectedEntityInfoError] = useState(null)
  const [selectedEntityInfoLoading, setSelectedEntityInfoLoading] = useState(false)
  const suppressedNodesRef = useRef(new Map())
  const suppressedNodeMetaRef = useRef(new Map())
  const suppressedNodeDefinitionsRef = useRef(new Map())
  const hiddenClusterIdsRef = useRef(new Set())
  const nodesRef = useRef([])
  const edgesRef = useRef([])
  const clustersRef = useRef([])
  const userPlacedPositionsRef = useRef(new Map())
  const manuallyReleasedEntitiesRef = useRef(new Set())
  const lastEntityIdRef = useRef(null)
  const graphAdjacencyRef = useRef(new Map())
  const nodeDepthLookupRef = useRef(new Map())
  const visibilityReevaluationTimeoutRef = useRef(null)

  const applyUserPlacedPositions = useCallback((nodeList) => {
    if (!Array.isArray(nodeList) || !nodeList.length) return nodeList
    const positionOverrides = userPlacedPositionsRef.current
    if (!(positionOverrides instanceof Map) || !positionOverrides.size) {
      return nodeList
    }

    let didOverride = false
    const mapped = nodeList.map((node) => {
      if (!node) return node
      const isSupportedNode = node.type === 'entity' || node.type === 'cluster'
      if (!isSupportedNode) return node

      const custom = positionOverrides.get(String(node.id))
      if (!custom) return node
      didOverride = true
      return {
        ...node,
        position: { x: custom.x, y: custom.y },
        positionAbsolute: { x: custom.x, y: custom.y },
      }
    })

    return didOverride ? mapped : nodeList
  }, [])

  useEffect(() => {
    nodesRef.current = nodes
  }, [nodes])

  useEffect(() => {
    edgesRef.current = edges
  }, [edges])

  useEffect(() => {
    return () => {
      if (visibilityReevaluationTimeoutRef.current != null) {
        clearTimeout(visibilityReevaluationTimeoutRef.current)
        visibilityReevaluationTimeoutRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const normalizedId = entityId != null ? String(entityId) : null
    if (normalizedId && lastEntityIdRef.current !== normalizedId) {
      lastEntityIdRef.current = normalizedId
      userPlacedPositionsRef.current = new Map()
      manuallyReleasedEntitiesRef.current = new Set()
      setBoardEntities({})
      return
    }

    if (!normalizedId) {
      lastEntityIdRef.current = null
      userPlacedPositionsRef.current = new Map()
      manuallyReleasedEntitiesRef.current = new Set()
      setBoardEntities({})
    }
  }, [entityId])

  useEffect(() => {
    if (!selectedEntityInfoId) {
      setSelectedEntityInfo(null)
      setSelectedEntityInfoError(null)
      setSelectedEntityInfoLoading(false)
      return
    }

    let cancelled = false

    const loadEntityInfo = async () => {
      setSelectedEntityInfoLoading(true)
      setSelectedEntityInfoError(null)
      setSelectedEntityInfo(null)

      try {
        const response = await getEntity(selectedEntityInfoId)
        if (cancelled) return
        const data = response?.data || response
        setSelectedEntityInfo(data || null)
      } catch (error) {
        if (cancelled) return
        console.error('Failed to load entity info:', error)
        setSelectedEntityInfo(null)
        setSelectedEntityInfoError(error.message || 'Failed to load entity info')
      } finally {
        if (!cancelled) {
          setSelectedEntityInfoLoading(false)
        }
      }
    }

    loadEntityInfo()

    return () => {
      cancelled = true
    }
  }, [selectedEntityInfoId])

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
    const nextId = String(entityToOpen)
    setSelectedEntityInfoId((prevId) => (prevId === nextId ? prevId : nextId))
  }, [])

  const handleCloseEntityInfo = useCallback(() => {
    setSelectedEntityInfoId(null)
    setSelectedEntityInfo(null)
    setSelectedEntityInfoError(null)
    setSelectedEntityInfoLoading(false)
  }, [])

  const markClusterExpanded = useCallback((clusterId) => {
    if (!clusterId) return
    hiddenClusterIdsRef.current.delete(String(clusterId))
  }, [])

  const markClusterCollapsed = useCallback((clusterId) => {
    if (!clusterId) return
    hiddenClusterIdsRef.current.add(String(clusterId))
  }, [])

  const collectDescendantInfo = useCallback((rootEntityId) => {
    if (!rootEntityId) return new Map()

    const normalizedRoot = String(rootEntityId)
    const edges = Array.isArray(edgesRef.current) ? edgesRef.current : []
    const descendants = new Map()
    const stack = [normalizedRoot]
    const visited = new Set()

    while (stack.length) {
      const currentId = stack.pop()
      if (!currentId || visited.has(currentId)) continue
      visited.add(currentId)

      edges.forEach((edge) => {
        if (!edge || edge?.data?.isClusterEdge || edge?.data?.isClusterChildEdge) return

        const parentRaw =
          edge?.parentId ?? edge?.data?.parentId ?? edge?.source ?? null
        const childRaw = edge?.childId ?? edge?.data?.childId ?? edge?.target ?? null

        if (parentRaw == null || childRaw == null) return

        const parentId = String(parentRaw)
        if (parentId !== currentId) return

        const childId = String(childRaw)
        if (!childId || childId === normalizedRoot) return

        if (!descendants.has(childId)) {
          const relationshipLabel =
            edge?.data?.relationshipType ||
            edge?.relationshipLabel ||
            edge?.label ||
            'Related'

          descendants.set(childId, {
            parentId,
            relationshipType: relationshipLabel,
          })
        }

        if (!visited.has(childId)) {
          stack.push(childId)
        }
      })
    }

    return descendants
  }, [])

  const performClusterBreakout = useCallback(
    (entries) => {
      if (!Array.isArray(entries) || !entries.length) return

      const suppressedNodes = suppressedNodesRef.current
      const suppressedMeta = suppressedNodeMetaRef.current
      const suppressedDefinitions = suppressedNodeDefinitionsRef.current

      if (!(suppressedNodes instanceof Map) || !(suppressedDefinitions instanceof Map)) {
        return
      }

      const normalized = entries
        .map((entry) => {
          const id = entry?.id != null ? String(entry.id) : null
          if (!id) return null

          const definition = entry?.definition || suppressedDefinitions.get(id) || null
          if (!definition) return null

          const meta =
            entry?.meta || suppressedMeta.get(id) || suppressedNodes.get(id) || null

          return { id, definition, meta }
        })
        .filter(Boolean)

      if (!normalized.length) return

      const manualReleaseSet = manuallyReleasedEntitiesRef.current
      const nodeMetaLookup = new Map()
      const definitionLookup = new Map()

      normalized.forEach(({ id, definition, meta }) => {
        nodeMetaLookup.set(id, meta || null)
        definitionLookup.set(id, definition)
        suppressedNodes.delete(id)
        suppressedMeta.delete(id)
        suppressedDefinitions.delete(id)
        manualReleaseSet.add(id)
      })

      const adjacency =
        graphAdjacencyRef.current instanceof Map
          ? graphAdjacencyRef.current
          : new Map()
      const depthLookup =
        nodeDepthLookupRef.current instanceof Map
          ? nodeDepthLookupRef.current
          : new Map()

      const relationshipDepthLimit = Number.isFinite(Number(relationshipDepth))
        ? Number(relationshipDepth)
        : null

      const edgesForLayout = [...edgesRef.current]
      const layoutEdgeIds = new Set(edgesForLayout.map((edge) => edge.id))
      const appendedEdgeIds = new Set(layoutEdgeIds)
      const edgesToAppend = []

      const plannedNodeIds = new Set(nodesRef.current.map((node) => String(node.id)))
      normalized.forEach(({ id }) => plannedNodeIds.add(id))

      const descendantNodeAdditions = []
      const queue = normalized.map(({ id }) => id)

      while (queue.length) {
        const currentId = queue.shift()
        if (!currentId) continue

        const parentDepth = depthLookup.get(currentId)
        if (
          relationshipDepthLimit != null &&
          parentDepth != null &&
          parentDepth >= relationshipDepthLimit
        ) {
          continue
        }

        const outgoingEdges = adjacency.get(currentId)
        if (!outgoingEdges?.length) continue

        outgoingEdges.forEach((edge) => {
          if (!edge) return

          const childRaw =
            edge?.childId != null
              ? edge.childId
              : edge?.target != null
              ? edge.target
              : null

          const childId = childRaw != null ? String(childRaw) : null
          if (!childId || childId === currentId) return

          const childDepth = depthLookup.get(childId)
          if (
            relationshipDepthLimit != null &&
            childDepth != null &&
            childDepth > relationshipDepthLimit
          ) {
            return
          }

          if (plannedNodeIds.has(childId)) {
            queue.push(childId)
            return
          }

          if (!suppressedNodes.has(childId)) {
            plannedNodeIds.add(childId)
            queue.push(childId)
            return
          }

          const definition = suppressedDefinitions.get(childId)
          if (!definition) return

          const meta =
            suppressedMeta.get(childId) || suppressedNodes.get(childId) || null

          suppressedNodes.delete(childId)
          suppressedMeta.delete(childId)
          suppressedDefinitions.delete(childId)
          manualReleaseSet.add(childId)
          plannedNodeIds.add(childId)
          queue.push(childId)

          nodeMetaLookup.set(childId, meta || null)
          definitionLookup.set(childId, definition)
          descendantNodeAdditions.push({ id: childId, definition })

          const flowEdge = convertNormalizedEdgeToReactFlow(edge)
          if (flowEdge && !appendedEdgeIds.has(flowEdge.id)) {
            appendedEdgeIds.add(flowEdge.id)
            edgesToAppend.push(flowEdge)
            edgesForLayout.push(flowEdge)
          }
        })
      }

      nodeMetaLookup.forEach((meta, childId) => {
        const parentId = meta?.parentId != null ? String(meta.parentId) : null
        if (!parentId) return
        const outgoingEdges = adjacency.get(parentId)
        if (!outgoingEdges?.length) return
        outgoingEdges.forEach((edge) => {
          if (!edge) return
          const childRaw =
            edge?.childId != null
              ? edge.childId
              : edge?.target != null
              ? edge.target
              : null
          if (childRaw == null) return
          const normalizedChild = String(childRaw)
          if (normalizedChild !== childId) return
          const flowEdge = convertNormalizedEdgeToReactFlow(edge)
          if (flowEdge && !appendedEdgeIds.has(flowEdge.id)) {
            appendedEdgeIds.add(flowEdge.id)
            edgesToAppend.push(flowEdge)
            edgesForLayout.push(flowEdge)
          }
        })
      })

      const additionMap = new Map()
      normalized.forEach(({ id }) => {
        const definition = definitionLookup.get(id)
        if (id && definition) {
          additionMap.set(id, definition)
        }
      })
      descendantNodeAdditions.forEach(({ id, definition }) => {
        if (id && definition) {
          additionMap.set(id, definition)
        }
      })

      if (!additionMap.size) return

      if (nodeMetaLookup.size) {
        setBoardEntities((prev) => {
          const next = { ...prev }
          let changed = false
          nodeMetaLookup.forEach((meta, id) => {
            if (!meta?.clusterId) return
            const key = String(id)
            const nextValue = {
              clusterId: String(meta.clusterId),
              relationshipType: meta?.relationshipType || null,
              sourceId: meta?.parentId != null ? String(meta.parentId) : null,
            }

            const existing = next[key]
            if (
              !existing ||
              existing.clusterId !== nextValue.clusterId ||
              existing.relationshipType !== nextValue.relationshipType ||
              existing.sourceId !== nextValue.sourceId
            ) {
              next[key] = nextValue
              changed = true
            }
          })
          return changed ? next : prev
        })
      }

      if (edgesToAppend.length) {
        setEdges((prevEdges) => {
          const existing = new Set(prevEdges.map((edge) => edge.id))
          const appendable = edgesToAppend.filter((edge) => {
            if (!edge) return false
            if (existing.has(edge.id)) return false
            existing.add(edge.id)
            return true
          })
          if (!appendable.length) return prevEdges
          return [...prevEdges, ...appendable]
        })
      }

      setNodes((prevNodes) => {
        const existingIds = new Set(prevNodes.map((node) => String(node.id)))
        let nextNodes = prevNodes
        let didAddNode = false

        additionMap.forEach((definition, id) => {
          if (!id || existingIds.has(id) || !definition) return

          const meta = nodeMetaLookup.get(id) || {}
          const entityMeta = meta?.entity || null

          const fallbackLabel = sanitizeEntityLabel(
            definition?.data?.label,
            sanitizeEntityLabel(
              definition?.data?.name,
              `Entity ${id}`
            )
          )
          const sanitizedLabel = sanitizeEntityLabel(entityMeta?.name, fallbackLabel)

          const normalizedNode = {
            ...definition,
            id,
            type: 'entity',
            data: {
              ...definition?.data,
              label: sanitizedLabel,
              typeName:
                definition?.data?.typeName ||
                definition?.data?.type?.name ||
                entityMeta?.typeName ||
                'Entity',
              entityId: id,
              isAdHoc: true,
              onSetTarget: handleSetTargetEntity,
              onOpenInfo: handleOpenEntityInfo,
              isExpandedProtected: Boolean(
                definition?.data?.isExpandedProtected ||
                  entityMeta?.isExpandedProtected
              ),
            },
          }

          existingIds.add(id)
          didAddNode = true
          nextNodes = [...nextNodes, normalizedNode]
        })

        if (!didAddNode) return prevNodes

        return applyUserPlacedPositions(
          layoutNodesHierarchically(nextNodes, edgesForLayout)
        )
      })
    },
    [
      applyUserPlacedPositions,
      handleOpenEntityInfo,
      handleSetTargetEntity,
      layoutNodesHierarchically,
      relationshipDepth,
    ]
  )

  const scheduleVisibilityReevaluation = useCallback(() => {
    if (visibilityReevaluationTimeoutRef.current != null) {
      clearTimeout(visibilityReevaluationTimeoutRef.current)
    }

    visibilityReevaluationTimeoutRef.current = setTimeout(() => {
      visibilityReevaluationTimeoutRef.current = null

      const visibleIds = new Set(nodesRef.current.map((node) => String(node.id)))
      const suppressed = suppressedNodesRef.current
      const suppressedMeta = suppressedNodeMetaRef.current
      const definitions = suppressedNodeDefinitionsRef.current

      if (!(suppressed instanceof Map) || !(definitions instanceof Map)) {
        return
      }

      const updates = []

      suppressed.forEach((meta, id) => {
        const normalizedId = String(id)
        const parentId = meta?.parentId != null ? String(meta.parentId) : null
        if (!parentId) return
        if (!visibleIds.has(parentId)) return
        const definition = definitions.get(normalizedId)
        if (!definition) return

        const suppressedMetaEntry =
          suppressedMeta instanceof Map ? suppressedMeta.get(normalizedId) : meta

        updates.push({
          id: normalizedId,
          definition,
          meta: suppressedMetaEntry || meta,
        })
      })

      if (updates.length) {
        performClusterBreakout(updates)
      }
    }, 0)
  }, [performClusterBreakout])

  const handleAddEntityFromCluster = useCallback(
    (clusterInput, specificEntityId) => {
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

      const selectedIdRaw =
        specificEntityId != null
          ? specificEntityId
          : typeof clusterInput === 'object' && clusterInput?.entityId != null
          ? clusterInput.entityId
          : null

      const selectedId = selectedIdRaw != null ? String(selectedIdRaw) : null

      const allNodeDefinitions = new Map()
      if (Array.isArray(nodesRef.current)) {
        nodesRef.current.forEach((node) => {
          if (!node || (node.type && node.type !== 'entity')) return
          const key = String(node.id)
          if (!key) return
          allNodeDefinitions.set(key, node)
        })
      }

      if (suppressedDefinitions instanceof Map) {
        suppressedDefinitions.forEach((definition, key) => {
          if (!definition) return
          const normalizedKey = String(key)
          if (!normalizedKey) return
          allNodeDefinitions.set(normalizedKey, definition)
        })
      }

      const clusterAllNodes = Array.isArray(clusterNode?.data?.allNodes)
        ? clusterNode.data.allNodes
        : []
      clusterAllNodes.forEach((node) => {
        if (!node) return
        if (node?.type && node.type !== 'entity') return
        const key = node?.id != null ? String(node.id) : null
        if (!key || allNodeDefinitions.has(key)) return

        const nodeData = node?.data || {}
        const fallbackLabel =
          nodeData?.label || node?.name || nodeData?.name || `Entity ${key}`

        const normalizedDefinition = {
          id: key,
          type: node?.type || 'entity',
          position: node?.position || { x: 0, y: 0 },
          data: {
            ...nodeData,
            label: sanitizeEntityLabel(fallbackLabel, `Entity ${key}`),
            typeName:
              nodeData?.typeName ||
              nodeData?.type?.name ||
              node?.typeName ||
              (node?.type && node?.type.name) ||
              'Entity',
            entityId:
              nodeData?.entityId != null
                ? String(nodeData.entityId)
                : key,
            isAdHoc:
              nodeData?.isAdHoc != null ? Boolean(nodeData.isAdHoc) : true,
            isExpandedProtected: Boolean(nodeData?.isExpandedProtected),
          },
        }

        allNodeDefinitions.set(key, normalizedDefinition)
      })

      let suppressedIdsToExpand = selectedId
        ? [selectedId].filter((id) => suppressedNodes.has(id))
        : []

      if (suppressedIdsToExpand.length === 0 && selectedId) {
        suppressedIdsToExpand = [String(selectedId)]
      }

      if (!suppressedIdsToExpand.length) {
        if (!selectedId) {
          markClusterExpanded(clusterId)
          return
        } else {
          const normalizedSelectedId = String(selectedId)
          suppressedNodes.delete(normalizedSelectedId)
          suppressedDefinitions.delete(normalizedSelectedId)
          if (suppressedMeta instanceof Map) {
            suppressedMeta.delete(normalizedSelectedId)
          }
          manuallyReleasedEntitiesRef.current.add(normalizedSelectedId)
        }
      }

      const nodesWithDefinitions = suppressedIdsToExpand
        .map((id) => {
          const key = String(id)
          return {
            id: key,
            definition:
              suppressedDefinitions.get(key) ||
              allNodeDefinitions.get(key) ||
              null,
            meta: suppressedMeta.get(key) || suppressedNodes.get(key) || null,
          }
        })
        .filter((entry) => Boolean(entry.definition))

      if (!nodesWithDefinitions.length) {
        if (!selectedId) {
          markClusterExpanded(clusterId)
        }
        return
      }

      const clusterParentId =
        clusterMeta.parentId != null ? String(clusterMeta.parentId) : null

      const visibleNodeIds = new Set(
        nodesRef.current.map((node) => String(node.id))
      )

      const validNodesWithDefinitions = nodesWithDefinitions.filter(
        ({ meta }) => {
          const parentId =
            meta?.parentId != null ? String(meta.parentId) : clusterParentId

          if (clusterParentId && parentId !== clusterParentId) {
            return false
          }

          if (parentId) {
            if (suppressedNodes.has(parentId)) return false
            return visibleNodeIds.has(parentId)
          }

          return true
        }
      )

      if (!validNodesWithDefinitions.length) {
        return
      }

      validNodesWithDefinitions.forEach(({ id }) => {
        manuallyReleasedEntitiesRef.current.add(String(id))
      })

      const relationshipLabel =
        clusterMeta.relationshipType || clusterMeta.label || 'Related'

      const edgesForLayout = [...edgesRef.current]

      validNodesWithDefinitions.forEach(({ id }) => {
        suppressedNodes.delete(String(id))
      })

      const descendantNodeAdditions = []
      const descendantEdgeAdditions = []

      const adjacency =
        graphAdjacencyRef.current instanceof Map
          ? graphAdjacencyRef.current
          : new Map()
      const depthLookup =
        nodeDepthLookupRef.current instanceof Map
          ? nodeDepthLookupRef.current
          : new Map()

      const relationshipDepthLimit = Number.isFinite(Number(relationshipDepth))
        ? Number(relationshipDepth)
        : null

      if (adjacency.size) {
        const suppressedMeta =
          suppressedNodeMetaRef.current instanceof Map
            ? suppressedNodeMetaRef.current
            : new Map()
        const plannedNodeIds = new Set(
          Array.isArray(nodesRef.current)
            ? nodesRef.current.map((node) => String(node.id))
            : []
        )
        const breakoutIds = new Set()
        const descendantAdditionIds = new Set()
        validNodesWithDefinitions.forEach(({ id }) => {
          if (!id) return
          const normalizedId = String(id)
          plannedNodeIds.add(normalizedId)
          breakoutIds.add(normalizedId)
        })

        const queue = validNodesWithDefinitions.map(({ id }) => String(id))
        const visited = new Set()
        const appendedEdgeIds = new Set()

        while (queue.length) {
          const currentId = queue.shift()
          if (!currentId || visited.has(currentId)) continue
          visited.add(currentId)

          const parentDepth = depthLookup.get(currentId) ?? 0
          if (
            relationshipDepthLimit != null &&
            parentDepth != null &&
            parentDepth >= relationshipDepthLimit
          ) {
            continue
          }

          const outgoingEdges = adjacency.get(currentId)
          if (!outgoingEdges || !outgoingEdges.length) continue

          outgoingEdges.forEach((edge) => {
            if (!edge) return

            const childRaw =
              edge?.childId != null
                ? edge.childId
                : edge?.target != null
                ? edge.target
                : null

            const childId = childRaw != null ? String(childRaw) : null
            if (!childId || childId === currentId) return

            const nextDepth = parentDepth + 1
            if (
              relationshipDepthLimit != null &&
              Number.isFinite(relationshipDepthLimit) &&
              nextDepth > relationshipDepthLimit
            ) {
              return
            }

            if (plannedNodeIds.has(childId)) {
              if (!depthLookup.has(childId)) {
                depthLookup.set(childId, nextDepth)
              }
              if (breakoutIds.has(childId)) {
                queue.push(childId)
              }
            } else if (!descendantAdditionIds.has(childId)) {
              let definitionToAdd = null

              if (suppressedNodes.has(childId)) {
                const definition = suppressedDefinitions.get(childId)
                if (!definition) return

                suppressedNodes.delete(childId)
                suppressedDefinitions.delete(childId)
                suppressedMeta.delete(childId)
                manuallyReleasedEntitiesRef.current.add(childId)

                definitionToAdd = definition
              } else {
                const existingDefinition = allNodeDefinitions.get(childId)
                if (!existingDefinition) return

                const fallbackLabel =
                  existingDefinition?.data?.label ||
                  existingDefinition?.data?.name ||
                  `Entity ${childId}`

                const normalizedDefinition = {
                  ...existingDefinition,
                  id: String(childId),
                  type: existingDefinition.type || 'entity',
                  position: existingDefinition.position || { x: 0, y: 0 },
                  data: {
                    ...existingDefinition?.data,
                    label: sanitizeEntityLabel(fallbackLabel, `Entity ${childId}`),
                    typeName:
                      existingDefinition?.data?.typeName ||
                      existingDefinition?.data?.type?.name ||
                      'Entity',
                    entityId:
                      existingDefinition?.data?.entityId != null
                        ? String(existingDefinition.data.entityId)
                        : String(childId),
                    isAdHoc:
                      existingDefinition?.data?.isAdHoc != null
                        ? Boolean(existingDefinition.data.isAdHoc)
                        : true,
                    isExpandedProtected: Boolean(
                      existingDefinition?.data?.isExpandedProtected
                    ),
                  },
                }

                definitionToAdd = normalizedDefinition
              }

              if (definitionToAdd) {
                descendantNodeAdditions.push({
                  id: childId,
                  definition: definitionToAdd,
                })
                descendantAdditionIds.add(childId)
                plannedNodeIds.add(childId)
                breakoutIds.add(childId)
                queue.push(childId)
                depthLookup.set(childId, nextDepth)
                allNodeDefinitions.set(childId, definitionToAdd)
              }
            }

            if (!depthLookup.has(childId)) {
              depthLookup.set(childId, nextDepth)
            }

            const reactFlowEdge = convertNormalizedEdgeToReactFlow(edge)
            if (reactFlowEdge && !appendedEdgeIds.has(reactFlowEdge.id)) {
              appendedEdgeIds.add(reactFlowEdge.id)
              descendantEdgeAdditions.push(reactFlowEdge)
            }
          })
        }

        if (descendantEdgeAdditions.length) {
          const layoutEdgeIds = new Set(edgesForLayout.map((edge) => edge.id))
          descendantEdgeAdditions.forEach((edge) => {
            if (!edge || layoutEdgeIds.has(edge.id)) return
            layoutEdgeIds.add(edge.id)
            edgesForLayout.push(edge)
          })
        }
      }

      const remainingHidden = clusterMeta.containedIds.filter((id) =>
        suppressedNodes.has(String(id))
      )

      setBoardEntities((prev) => {
        const next = { ...prev }
        let changed = false
        validNodesWithDefinitions.forEach(({ id }) => {
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

      if (descendantEdgeAdditions.length) {
        setEdges((prevEdges) => {
          const existing = new Set(prevEdges.map((edge) => edge.id))
          const appendable = descendantEdgeAdditions.filter(
            (edge) => !existing.has(edge.id)
          )
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

        validNodesWithDefinitions.forEach(({ id, definition, meta }) => {
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

          const fallbackLabel = sanitizeEntityLabel(newNode.data?.label, `Entity ${id}`)
          const sanitizedLabel = sanitizeEntityLabel(entityMeta?.name, fallbackLabel)

          const normalizedNode = {
            ...newNode,
            id: String(id),
            type: 'entity',
            data: {
              ...newNode.data,
              label: sanitizedLabel,
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

        descendantNodeAdditions.forEach(({ id, definition }) => {
          if (!id || existingIds.has(String(id))) return

          const normalizedNode = {
            ...definition,
            id: String(id),
            type: 'entity',
            data: {
              ...definition?.data,
              label:
                definition?.data?.label ||
                definition?.data?.name ||
                `Entity ${id}`,
              typeName:
                definition?.data?.typeName ||
                definition?.data?.type?.name ||
                'Entity',
              entityId: String(id),
              isAdHoc: true,
              onSetTarget: handleSetTargetEntity,
              onOpenInfo: handleOpenEntityInfo,
              isExpandedProtected: Boolean(
                definition?.data?.isExpandedProtected
              ),
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

        return applyUserPlacedPositions(
          layoutNodesHierarchically(mappedNodes, edgesForLayout)
        )
      })

      const normalizedLabel = `${relationshipLabel} (${remainingHidden.length})`
      clusterMeta.label = normalizedLabel
      clustersRef.current = clustersRef.current.map((cluster) =>
        String(cluster.id) === clusterId
          ? { ...cluster, label: normalizedLabel }
          : cluster
      )

      // Keep the cluster visually collapsed; do not trigger global
      // reevaluation so that only the selected entity is revealed.
    },
    [
      applyUserPlacedPositions,
      handleOpenEntityInfo,
      handleSetTargetEntity,
      markClusterExpanded,
      relationshipDepth,
    ]
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

    const nodeLookup = new Map(
      nodesRef.current.map((graphNode) => [String(graphNode.id), graphNode])
    )

    const descendantInfoMap = collectDescendantInfo(entityId)
    const descendantEntries = Array.from(descendantInfoMap.entries())
    const descendantIdsToRemove = descendantEntries
      .map(([childId]) => String(childId))
      .filter((childId) => {
        if (childId === entityId) return false
        const childNode = nodeLookup.get(childId)
        if (!childNode) return false
        if (childNode?.data?.isExpandedProtected) return false
        return true
      })

    const descendantRemovalSet = new Set(descendantIdsToRemove)

    manuallyReleasedEntitiesRef.current.delete(entityId)
    userPlacedPositionsRef.current.delete(entityId)

    descendantIdsToRemove.forEach((childId) => {
      manuallyReleasedEntitiesRef.current.delete(String(childId))
      userPlacedPositionsRef.current.delete(String(childId))
    })

    setBoardEntities((prev) => {
      const next = { ...prev }
      let changed = false

      if (next[entityId]) {
        delete next[entityId]
        changed = true
      }

      descendantIdsToRemove.forEach((childId) => {
        if (!next[childId]) return
        delete next[childId]
        changed = true
      })

      return changed ? next : prev
    })

    let finalRemainingPlaced = []

    setNodes((prevNodes) => {
      const clusterNode = prevNodes.find((node) => node.id === clusterInfo.id)

      const filteredNodes = prevNodes.filter((node) => {
        const nodeId = String(node.id)
        if (nodeId === entityId && node.type === 'entity') {
          return !node.data?.isAdHoc
        }

        if (descendantRemovalSet.has(nodeId) && node.type === 'entity') {
          if (node.data?.isExpandedProtected) return true
          return false
        }

        return true
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

      return applyUserPlacedPositions(
        positionEntitiesBelowCluster(
          nextNodes,
          updatedClusterNode || clusterNode,
          remainingPlaced
        )
      )
    })

    setEdges((prevEdges) => {
      const removalIds = new Set([entityId, ...descendantIdsToRemove])
      return prevEdges.filter((edge) => {
        const sourceId =
          edge?.source != null
            ? String(edge.source)
            : edge?.parentId != null
            ? String(edge.parentId)
            : null
        const targetId =
          edge?.target != null
            ? String(edge.target)
            : edge?.childId != null
            ? String(edge.childId)
            : null

        if (sourceId && removalIds.has(sourceId)) return false
        if (targetId && removalIds.has(targetId)) return false
        return true
      })
    })

    const relationshipLabel = clusterInfo.relationshipType || clusterInfo.label || 'Related'
    const sanitizedEntityLabel = sanitizeEntityLabel(
      entity?.name,
      `Entity ${entityId}`
    )

    const suppressedMeta = {
      clusterId,
      parentId: clusterInfo.sourceId ? String(clusterInfo.sourceId) : null,
      relationshipType: relationshipLabel,
      entity: {
        id: entityId,
        name: sanitizedEntityLabel,
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
        label: sanitizedEntityLabel,
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

    const clustersList = Array.isArray(clustersRef.current)
      ? clustersRef.current
      : []

    descendantIdsToRemove.forEach((childId) => {
      const childNode = nodeLookup.get(childId)
      if (!childNode) return

      const info = descendantInfoMap.get(childId) || {}
      const parentId = info?.parentId != null ? String(info.parentId) : null
      const relationshipType = info?.relationshipType || 'Related'

      const relatedCluster = clustersList.find((cluster) => {
        if (!cluster) return false
        const normalizedParent = cluster?.parentId != null ? String(cluster.parentId) : null
        if (normalizedParent && parentId && normalizedParent !== parentId) return false
        return Array.isArray(cluster?.containedIds)
          ? cluster.containedIds.some((value) => String(value) === String(childId))
          : false
      })

      const suppressedMetaEntry = {
        clusterId: relatedCluster ? String(relatedCluster.id) : null,
        parentId,
        relationshipType,
        entity: {
          id: String(childId),
          name: childNode?.data?.label || `Entity ${childId}`,
          typeName: childNode?.data?.typeName || childNode?.data?.type?.name || 'Entity',
          type: childNode?.data?.type || null,
          isExpandedProtected: Boolean(childNode?.data?.isExpandedProtected),
        },
      }

      suppressedNodesRef.current.set(String(childId), suppressedMetaEntry)
      suppressedNodeMetaRef.current.set(String(childId), suppressedMetaEntry)
      suppressedNodeDefinitionsRef.current.set(String(childId), {
        id: String(childId),
        type: 'entity',
        position: { x: 0, y: 0 },
        data: {
          label: childNode?.data?.label || `Entity ${childId}`,
          typeName: childNode?.data?.typeName || childNode?.data?.type?.name || 'Entity',
          entityId: String(childId),
          isAdHoc: true,
          isExpandedProtected: Boolean(childNode?.data?.isExpandedProtected),
        },
      })
    })
  }, [
    applyUserPlacedPositions,
    collectDescendantInfo,
    markClusterCollapsed,
    markClusterExpanded,
  ])

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
        manuallyReleasedEntitiesRef.current.delete(key)
        userPlacedPositionsRef.current.delete(key)
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

        return applyUserPlacedPositions(
          layoutNodesHierarchically(mappedNodes, filteredEdges)
        )
      })

      markClusterCollapsed(clusterId)
    },
    [applyUserPlacedPositions, markClusterCollapsed]
  )

  const handleNodeDragStop = useCallback(
    (event, node) => {
      if (!node || (node.type !== 'entity' && node.type !== 'cluster')) return

      const id = String(node.id)
      userPlacedPositionsRef.current.set(id, {
        x: node?.position?.x ?? 0,
        y: node?.position?.y ?? 0,
      })

      if (node.type !== 'entity') return

      const entityId = id
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

      return applyUserPlacedPositions(nextNodes)
    })
  }, [applyUserPlacedPositions, boardEntities])

  useEffect(() => {
    if (!entityId) return
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

            // Retain edges where only one side is suppressed so that descendant
            // relationships remain connected when the suppressed node becomes
            // visible.
            return true
          })
        }

        const normalizedGraphEdges = sanitizedEdges
          .map((edge) => normalizeGraphEdge(edge, entityId))
          .filter(Boolean)

        const adjacencyFromGraph = buildAdjacencyFromEdges(normalizedGraphEdges)
        graphAdjacencyRef.current = adjacencyFromGraph
        nodeDepthLookupRef.current = computeDepthLookup(
          entityId,
          adjacencyFromGraph
        )

        const ancestorDepthLimit = Number.isFinite(Number(relationshipDepth))
          ? Number(relationshipDepth)
          : null
        const forcedAncestorIds = computeAncestorInclusionSet(
          entityId,
          normalizedGraphEdges,
          ancestorDepthLimit
        )

        const {
          nodes: layoutedNodes,
          edges: layoutedEdges,
          suppressedNodes: layoutedSuppressedNodes,
          clusters: layoutedClusters,
        } = buildReactFlowGraph(
          { ...graphData, edges: sanitizedEdges },
          entityId,
          undefined,
          { alwaysIncludeIds: forcedAncestorIds }
        )
        if (active) {
          const decorateNode = (node) => {
            if (!node) return null
            if (node.type === 'cluster') {
              return {
                ...node,
                data: {
                  ...node.data,
                  onAddToBoard: (cluster, entityId) =>
                    handleAddEntityFromCluster(cluster, entityId),
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
          const manualReleaseSet = manuallyReleasedEntitiesRef.current

          const assignSuppressedEntry = (id, info) => {
            if (manualReleaseSet.has(id)) {
              return
            }
            const sanitizedName = sanitizeEntityLabel(info?.entity?.name, `Entity ${id}`)
            suppressedMap.set(id, {
              clusterId: info?.clusterId != null ? String(info.clusterId) : null,
              parentId: info?.parentId != null ? String(info.parentId) : null,
              relationshipType: info?.relationshipType || 'Related',
              entity: info?.entity
                ? {
                    ...info.entity,
                    id: String(info.entity.id ?? id),
                    name: sanitizedName,
                    typeName:
                      info.entity?.typeName || info.entity?.type?.name || 'Entity',
                    isExpandedProtected: Boolean(info.entity?.isExpandedProtected),
                  }
                : null,
            })
          }

          if (rawSuppressed instanceof Map) {
            rawSuppressed.forEach((info, key) => {
              const id = String(key)
              assignSuppressedEntry(id, info)
            })
          } else {
            Object.entries(rawSuppressed || {}).forEach(([key, info]) => {
              const id = String(key)
              assignSuppressedEntry(id, info)
            })
          }

          suppressedNodesRef.current = suppressedMap
          suppressedNodeMetaRef.current = new Map(suppressedMap)

          const suppressedDefinitions = new Map()
          if (rawSuppressed instanceof Map) {
            rawSuppressed.forEach((info, key) => {
              const id = String(key)
              const entity = info?.entity || null
              const sanitizedLabel = sanitizeEntityLabel(entity?.name, `Entity ${id}`)
              suppressedDefinitions.set(id, {
                id,
                type: 'entity',
                position: { x: 0, y: 0 },
                data: {
                  label: sanitizedLabel,
                  typeName: entity?.typeName || entity?.type?.name || 'Entity',
                  entityId: id,
                  isAdHoc: true,
                  isExpandedProtected: Boolean(entity?.isExpandedProtected),
                },
              })
            })
          } else {
            Object.entries(rawSuppressed || {}).forEach(([key, info]) => {
              const id = String(key)
              const entity = info?.entity || null
              const sanitizedLabel = sanitizeEntityLabel(entity?.name, `Entity ${id}`)
              suppressedDefinitions.set(id, {
                id,
                type: 'entity',
                position: { x: 0, y: 0 },
                data: {
                  label: sanitizedLabel,
                  typeName: entity?.typeName || entity?.type?.name || 'Entity',
                  entityId: id,
                  isAdHoc: true,
                  isExpandedProtected: Boolean(entity?.isExpandedProtected),
                },
              })
            })
          }

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

          const existingNodesMap = new Map(
            Array.isArray(nodesRef.current)
              ? nodesRef.current.map((node) => [String(node.id), node])
              : []
          )

          const mergedNodes = [...decoratedNodes]

          manualReleaseSet.forEach((releasedId) => {
            const key = String(releasedId)
            if (mergedNodes.some((node) => String(node.id) === key)) return
            const existingNode = existingNodesMap.get(key)
            if (existingNode) {
              mergedNodes.push(existingNode)
              return
            }
            const suppressedDefinition = suppressedDefinitions.get(key)
            if (suppressedDefinition) {
              const decoratedSuppressed = decorateNode(suppressedDefinition)
              if (decoratedSuppressed) {
                mergedNodes.push({
                  ...decoratedSuppressed,
                  id: key,
                  type: 'entity',
                })
              }
            }
          })

          const layoutedEdgeIds = new Set(
            Array.isArray(layoutedEdges)
              ? layoutedEdges.map((edge) => edge.id)
              : []
          )

          const preservedEdges = (Array.isArray(edgesRef.current)
            ? edgesRef.current
            : []
          ).filter((edge) => {
            if (!edge || layoutedEdgeIds.has(edge.id)) return false
            const rawChild =
              edge?.data?.childId ?? edge?.target ?? edge?.data?.targetId ?? null
            const rawSource =
              edge?.data?.parentId ?? edge?.source ?? edge?.data?.sourceId ?? null
            const childId = rawChild != null ? String(rawChild) : null
            const sourceId = rawSource != null ? String(rawSource) : null

            if (childId && manualReleaseSet.has(childId)) return true
            if (sourceId && manualReleaseSet.has(sourceId)) return true
            return false
          })

          const mergedEdges = Array.isArray(layoutedEdges)
            ? [...layoutedEdges, ...preservedEdges]
            : preservedEdges

          setNodes(applyUserPlacedPositions(mergedNodes))
          setEdges(mergedEdges)
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
    applyUserPlacedPositions,
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

      const overrides = userPlacedPositionsRef.current
      if (overrides instanceof Map && overrides.size) {
        arrangedNodes.forEach((node) => {
          if (!node) return
          const isSupportedNode = node.type === 'entity' || node.type === 'cluster'
          if (!isSupportedNode) return

          const key = String(node.id)
          if (!overrides.has(key)) return
          overrides.set(key, {
            x: node.position?.x ?? 0,
            y: node.position?.y ?? 0,
          })
        })
      }

      return applyUserPlacedPositions(arrangedNodes)
    })

    if (reactFlowInstance) {
      requestAnimationFrame(() => {
        reactFlowInstance.fitView({ padding: 0.2, duration: 400 })
      })
    }
  }, [
    applyUserPlacedPositions,
    boardEntities,
    edges,
    entityId,
    reactFlowInstance,
  ])

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

      <EntityInfoDrawer
        entityId={selectedEntityInfoId}
        entity={selectedEntityInfo}
        isLoading={selectedEntityInfoLoading}
        error={selectedEntityInfoError}
        onClose={handleCloseEntityInfo}
      />
    </div>
  )
}
