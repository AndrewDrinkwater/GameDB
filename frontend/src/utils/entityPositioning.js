export const DEFAULT_CLUSTER_WIDTH = 220
export const DEFAULT_CLUSTER_HEIGHT = 160
export const DEFAULT_ENTITY_WIDTH = 220
export const DEFAULT_ENTITY_HEIGHT = 120
export const CLUSTER_ENTITY_GAP = 40
export const DEFAULT_CLUSTER_THRESHOLD = 5

const HIERARCHY_HORIZONTAL_PADDING = 40
const HIERARCHY_VERTICAL_PADDING = 80
const LEVEL_HORIZONTAL_SPACING =
  Math.max(DEFAULT_ENTITY_WIDTH, DEFAULT_CLUSTER_WIDTH) + HIERARCHY_HORIZONTAL_PADDING
const LEVEL_VERTICAL_SPACING =
  Math.max(DEFAULT_ENTITY_HEIGHT, DEFAULT_CLUSTER_HEIGHT) + HIERARCHY_VERTICAL_PADDING
const GROUP_HORIZONTAL_GAP = LEVEL_HORIZONTAL_SPACING * 0.75
const BASE_NODE_WIDTH = Math.max(DEFAULT_ENTITY_WIDTH, DEFAULT_CLUSTER_WIDTH)

const CLUSTER_ENTITY_HORIZONTAL_SPACING = DEFAULT_ENTITY_WIDTH + CLUSTER_ENTITY_GAP

function computeNodeLevels(edges, centerId) {
  const centerKey = centerId != null ? String(centerId) : null
  const levels = new Map()
  if (!centerKey) return levels

  const adjacency = new Map()

  edges.forEach((edge) => {
    const source = String(edge.source)
    const target = String(edge.target)

    if (!adjacency.has(source)) adjacency.set(source, new Set())
    if (!adjacency.has(target)) adjacency.set(target, new Set())

    adjacency.get(source).add(target)
    adjacency.get(target).add(source)
  })

  const visited = new Set([centerKey])
  const queue = [centerKey]
  levels.set(centerKey, 0)

  while (queue.length) {
    const current = queue.shift()
    const currentLevel = levels.get(current) ?? 0
    const neighbors = adjacency.get(current)
    if (!neighbors) continue

    neighbors.forEach((neighbor) => {
      if (visited.has(neighbor)) return
      visited.add(neighbor)
      levels.set(neighbor, currentLevel + 1)
      queue.push(neighbor)
    })
  }

  return levels
}

function determineClusterAnchor(edge, levelMap, centerKey) {
  if (!edge) return null
  const source = String(edge.source)
  const target = String(edge.target)

  if (source === target) return source

  const sourceLevel = levelMap.get(source)
  const targetLevel = levelMap.get(target)

  if (sourceLevel != null && targetLevel != null) {
    if (sourceLevel < targetLevel) return source
    if (targetLevel < sourceLevel) return target
  }

  if (source === centerKey) return source
  if (target === centerKey) return target

  if (sourceLevel != null && targetLevel == null) return source
  if (targetLevel != null && sourceLevel == null) return target

  if (sourceLevel != null && targetLevel != null && sourceLevel === targetLevel) {
    return source <= target ? source : target
  }

  return source
}

export function slugifyTypeName(name) {
  return String(name ?? 'group')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function getNodeDimensions(nodeMap, nodeId) {
  const node = nodeMap.get(String(nodeId))
  if (!node) {
    return { width: DEFAULT_ENTITY_WIDTH, height: DEFAULT_ENTITY_HEIGHT }
  }

  const isCluster = node.type === 'cluster'
  const width = node.width ?? (isCluster ? DEFAULT_CLUSTER_WIDTH : DEFAULT_ENTITY_WIDTH)
  const height = node.height ?? (isCluster ? DEFAULT_CLUSTER_HEIGHT : DEFAULT_ENTITY_HEIGHT)

  return { width, height }
}

export function layoutNodesHierarchically(nodes, edges, centerId) {
  const normalizedNodes = Array.isArray(nodes)
    ? nodes.map((node) => ({ ...node, id: String(node.id) }))
    : []

  if (!normalizedNodes.length) return nodes

  const centerKey =
    centerId != null ? String(centerId) : normalizedNodes[0]?.id ?? null

  if (!centerKey) return nodes

  const normalizedEdges = Array.isArray(edges)
    ? edges.map((edge) => ({
        ...edge,
        source: String(edge.source),
        target: String(edge.target),
        data: edge?.data || {},
      }))
    : []

  const nodeMap = new Map(normalizedNodes.map((node) => [node.id, node]))
  const adjacency = new Map()

  normalizedEdges.forEach((edge) => {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, [])
    if (!adjacency.has(edge.target)) adjacency.set(edge.target, [])

    adjacency.get(edge.source).push({ edge, other: edge.target })
    adjacency.get(edge.target).push({ edge, other: edge.source })
  })

  const levels = new Map()
  const visited = new Set()

  if (nodeMap.has(centerKey)) {
    levels.set(centerKey, 0)
    visited.add(centerKey)

    const queue = [centerKey]
    while (queue.length > 0) {
      const current = queue.shift()
      const currentLevel = levels.get(current) ?? 0
      const neighbors = adjacency.get(current) || []

      neighbors.forEach(({ edge, other }) => {
        if (visited.has(other)) return
        visited.add(other)
        const isParent = edge.target === current
        const nextLevel = isParent ? currentLevel - 1 : currentLevel + 1
        levels.set(other, nextLevel)
        queue.push(other)
      })
    }
  }

  normalizedNodes.forEach((node) => {
    if (!levels.has(node.id)) levels.set(node.id, 0)
  })

  const minLevel = Math.min(...levels.values())
  levels.forEach((value, key) => {
    levels.set(key, value - minLevel)
  })

  const getRelationshipTypeForEdge = (edge, nodeId) => {
    if (!edge) return null

    const edgeType =
      edge?.data?.relationshipType || edge?.data?.typeName || edge?.label || null

    if (edgeType) return edgeType

    const node = nodeMap.get(nodeId)
    if (node?.data?.relationshipType) return node.data.relationshipType
    if (node?.data?.typeName) return node.data.typeName

    return null
  }

  const getGroupInfoForNode = (nodeId) => {
    if (nodeId === centerKey) {
      return {
        groupKey: `${centerKey}::center`,
        relationshipType: 'Center',
        parentId: null,
      }
    }

    const nodeLevel = levels.get(nodeId) ?? 0
    const neighbors = adjacency.get(nodeId) || []
    let bestParent = null
    let bestParentLevel = -Infinity
    let bestType = null

    neighbors.forEach(({ edge, other }) => {
      const otherLevel = levels.get(other)
      if (otherLevel == null) return
      if (otherLevel >= nodeLevel) return

      if (otherLevel > bestParentLevel) {
        bestParent = other
        bestParentLevel = otherLevel
        bestType = getRelationshipTypeForEdge(edge, nodeId)
        return
      }

      if (otherLevel === bestParentLevel) {
        const candidateType = getRelationshipTypeForEdge(edge, nodeId) || ''
        const currentType = bestType || ''
        const typeComparison = candidateType.localeCompare(currentType, undefined, {
          sensitivity: 'base',
        })

        if (typeComparison < 0) {
          bestParent = other
          bestType = candidateType
        } else if (typeComparison === 0) {
          if ((other || '').localeCompare(bestParent || '') < 0) {
            bestParent = other
          }
        }
      }
    })

    if (!bestParent) {
      const fallbackType =
        nodeMap.get(nodeId)?.data?.relationshipType ||
        nodeMap.get(nodeId)?.data?.typeName ||
        'Relationship'

      return {
        groupKey: `none::${fallbackType}`,
        relationshipType: fallbackType,
        parentId: null,
      }
    }

    const relationshipType =
      bestType ||
      nodeMap.get(nodeId)?.data?.relationshipType ||
      nodeMap.get(nodeId)?.data?.typeName ||
      'Relationship'

    return {
      groupKey: `${bestParent}::${relationshipType}`,
      relationshipType,
      parentId: bestParent,
    }
  }

  const groupedByLevel = new Map()

  normalizedNodes.forEach((node) => {
    const id = node.id
    const level = levels.get(id) ?? 0
    const groupInfo = getGroupInfoForNode(id)

    if (!groupedByLevel.has(level)) groupedByLevel.set(level, new Map())
    const groupMap = groupedByLevel.get(level)

    if (!groupMap.has(groupInfo.groupKey)) {
      groupMap.set(groupInfo.groupKey, {
        ...groupInfo,
        nodeIds: [],
      })
    }

    groupMap.get(groupInfo.groupKey).nodeIds.push(id)
  })

  const positionMap = new Map()

  groupedByLevel.forEach((groupMap, level) => {
    const groups = Array.from(groupMap.values()).map((group) => ({
      ...group,
      nodeIds: group.nodeIds
        .map((id) => String(id))
        .sort((a, b) => {
          const nodeA = nodeMap.get(a)
          const nodeB = nodeMap.get(b)
          const labelA = nodeA?.data?.label || a
          const labelB = nodeB?.data?.label || b
          return labelA.localeCompare(labelB, undefined, { sensitivity: 'base' })
        }),
    }))

    if (!groups.length) return

    const orderedGroups = groups.sort((a, b) => {
      const parentComparison = (a.parentId || '').localeCompare(
        b.parentId || '',
        undefined,
        { sensitivity: 'base' }
      )

      if (parentComparison !== 0) return parentComparison

      return (a.relationshipType || '').localeCompare(
        b.relationshipType || '',
        undefined,
        { sensitivity: 'base' }
      )
    })

    const groupMetas = orderedGroups.map((group) => {
      const maxNodeWidth = group.nodeIds.reduce((maxWidth, nodeId) => {
        const { width } = getNodeDimensions(nodeMap, nodeId)
        return Math.max(maxWidth, width)
      }, 0)

      const preferredCenter = (() => {
        if (!group.parentId) return null
        const parentPosition = positionMap.get(String(group.parentId))
        if (!parentPosition) return null
        const parentWidth = getNodeDimensions(nodeMap, group.parentId).width
        return parentPosition.x + parentWidth / 2
      })()

      const span =
        Math.max(group.nodeIds.length - 1, 0) * LEVEL_HORIZONTAL_SPACING +
        Math.max(maxNodeWidth, BASE_NODE_WIDTH)

      return {
        group,
        span,
        maxNodeWidth: Math.max(maxNodeWidth, BASE_NODE_WIDTH),
        preferredCenter,
      }
    })

    const rootMetas = groupMetas.filter((meta) => meta.preferredCenter == null)
    if (rootMetas.length) {
      const totalSpan =
        rootMetas.reduce((total, meta) => total + meta.span, 0) +
        GROUP_HORIZONTAL_GAP * Math.max(rootMetas.length - 1, 0)

      let cursor = -totalSpan / 2
      rootMetas.forEach((meta) => {
        meta.preferredCenter = cursor + meta.span / 2
        cursor += meta.span + GROUP_HORIZONTAL_GAP
      })
    }

    const sortedMetas = [...groupMetas].sort((a, b) => a.preferredCenter - b.preferredCenter)

    let lastRight = null
    sortedMetas.forEach((meta) => {
      if (lastRight == null) {
        meta.center = meta.preferredCenter
      } else {
        const minCenter = lastRight + GROUP_HORIZONTAL_GAP + meta.span / 2
        meta.center = Math.max(meta.preferredCenter, minCenter)
      }

      meta.left = meta.center - meta.span / 2
      meta.right = meta.center + meta.span / 2
      lastRight = meta.right
    })

    let nextLeft = null
    for (let index = sortedMetas.length - 1; index >= 0; index -= 1) {
      const meta = sortedMetas[index]
      if (nextLeft != null) {
        const maxCenter = nextLeft - GROUP_HORIZONTAL_GAP - meta.span / 2
        if (meta.center > maxCenter) {
          meta.center = maxCenter
          meta.left = meta.center - meta.span / 2
          meta.right = meta.center + meta.span / 2
        }
      }
      nextLeft = meta.left
    }

    sortedMetas.forEach((meta) => {
      const { group, center, span, maxNodeWidth } = meta
      const startX = center - span / 2
      const y = level * LEVEL_VERTICAL_SPACING

      group.nodeIds.forEach((nodeId, nodeIndex) => {
        const { width: nodeWidth } = getNodeDimensions(nodeMap, nodeId)
        const slotX = startX + nodeIndex * LEVEL_HORIZONTAL_SPACING
        const adjustedX = slotX + (maxNodeWidth - nodeWidth) / 2
        positionMap.set(nodeId, { x: adjustedX, y })
      })
    })
  })

  return nodes.map((node) => {
    const position = positionMap.get(String(node.id))
    if (!position) return node
    return { ...node, position }
  })
}

export function buildReactFlowGraph(
  data,
  entityId,
  clusterThreshold = DEFAULT_CLUSTER_THRESHOLD
) {
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

  const enrichedNodes = rawNodes.map((node) => ({
    ...node,
    typeName: node?.type?.name || node?.typeName || null,
  }))

  const levelMap = computeNodeLevels(parsedEdges, centerKey)

  const adjacencyMap = new Map()

  parsedEdges.forEach((edge) => {
    if (!adjacencyMap.has(edge.source)) adjacencyMap.set(edge.source, new Set())
    if (!adjacencyMap.has(edge.target)) adjacencyMap.set(edge.target, new Set())
    adjacencyMap.get(edge.source).add(edge.target)
    adjacencyMap.get(edge.target).add(edge.source)
  })

  const groupedByTypeAndAnchor = new Map()

  parsedEdges.forEach((edge) => {
    const anchorId = determineClusterAnchor(edge, levelMap, centerKey)
    const typeName = edge.typeName
    const key = `${typeName}::${anchorId ?? ''}`

    if (!groupedByTypeAndAnchor.has(key)) {
      groupedByTypeAndAnchor.set(key, {
        typeName,
        anchorId: anchorId != null ? String(anchorId) : null,
        edges: [],
      })
    }

    groupedByTypeAndAnchor.get(key).edges.push(edge)
  })

  const clusterNodes = []
  const clusterEdges = []
  const clusterSuppressedByAnchor = new Map()
  const hiddenNodeIds = new Set()
  const consumedEdgeIds = new Set()

  const protectedNodeIds = new Set([centerKey])
  const extraProtected = Array.isArray(data?.protectedNodeIds)
    ? data.protectedNodeIds.map((value) => String(value))
    : []
  extraProtected.forEach((id) => protectedNodeIds.add(id))

  const clusterGroups = []

  groupedByTypeAndAnchor.forEach((group) => {
    if (!group?.edges?.length) return
    if (group.edges.length < clusterThreshold) return

    const anchorLevel = group.anchorId != null ? levelMap.get(String(group.anchorId)) ?? Infinity : Infinity
    clusterGroups.push({ ...group, anchorLevel })
  })

  clusterGroups
    .sort((a, b) => {
      const levelA = a.anchorLevel ?? Infinity
      const levelB = b.anchorLevel ?? Infinity
      if (levelA !== levelB) return levelA - levelB
      return (a.typeName || '').localeCompare(b.typeName || '', undefined, { sensitivity: 'base' })
    })
    .forEach(({ typeName, anchorId, edges: edgesForGroup }) => {
      const nodeIds = new Set()
      edgesForGroup.forEach((edge) => {
        nodeIds.add(edge.source)
        nodeIds.add(edge.target)
        consumedEdgeIds.add(edge.id)
    })

      const containedIds = [...nodeIds].filter((id) => {
        if (id === centerKey) return false
        if (anchorId && id === anchorId) return false
        if (protectedNodeIds.has(id)) return false
        return true
      })

      if (!containedIds.length) return

      containedIds.forEach((id) => hiddenNodeIds.add(id))

      const normalizedAnchorId = anchorId != null ? String(anchorId) : null
      const isAnchorHidden = normalizedAnchorId ? hiddenNodeIds.has(normalizedAnchorId) : false

      const clusterId = `cluster-${anchorId ?? 'unknown'}-${slugifyTypeName(typeName)}`
      const entityCount = containedIds.length

      clusterNodes.push({
        id: clusterId,
        type: 'cluster',
        data: {
          label: `${entityCount} ${typeName}${entityCount === 1 ? '' : 's'}`,
          relationshipType: typeName,
          count: entityCount,
          containedIds,
          sourceId: anchorId || centerKey,
          allNodes: enrichedNodes,
        },
        position: { x: 0, y: 0 },
      })

      clusterEdges.push({
        id: `edge-${clusterId}`,
        source: anchorId || centerKey,
        target: clusterId,
        type: 'smoothstep',
        label: `${typeName} (${entityCount})`,
        animated: false,
        sourceHandle: 'bottom',
        targetHandle: 'top',
      })

      if (isAnchorHidden && normalizedAnchorId) {
        clusterSuppressedByAnchor.set(clusterId, new Set([normalizedAnchorId]))
      }
    })

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
        data: { label, isCenter, typeName, entityId: id },
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

  const reachableWithoutHidden = new Set()
  const reachableQueue = []

  protectedNodeIds.forEach((id) => {
    const key = String(id)
    if (hiddenNodeIds.has(key)) return
    if (!reachableWithoutHidden.has(key)) {
      reachableWithoutHidden.add(key)
      reachableQueue.push(key)
    }
  })

  while (reachableQueue.length) {
    const current = reachableQueue.shift()
    const neighbors = adjacencyMap.get(current)
    if (!neighbors) continue

    neighbors.forEach((neighbor) => {
      if (hiddenNodeIds.has(neighbor)) return
      if (reachableWithoutHidden.has(neighbor)) return
      reachableWithoutHidden.add(neighbor)
      reachableQueue.push(neighbor)
    })
  }

  const suppressedNodeIds = new Set()
  const nodeSuppressedBy = new Map()

  hiddenNodeIds.forEach((hiddenId) => {
    const visited = new Set([hiddenId])
    const queue = [hiddenId]

    while (queue.length) {
      const current = queue.shift()
      const neighbors = adjacencyMap.get(current)
      if (!neighbors) continue

      neighbors.forEach((neighbor) => {
        if (visited.has(neighbor)) return
        visited.add(neighbor)

        if (hiddenNodeIds.has(neighbor)) {
          queue.push(neighbor)
          return
        }

        if (protectedNodeIds.has(neighbor)) return
        if (reachableWithoutHidden.has(neighbor)) return

        suppressedNodeIds.add(neighbor)
        if (!nodeSuppressedBy.has(neighbor)) nodeSuppressedBy.set(neighbor, new Set())
        nodeSuppressedBy.get(neighbor).add(hiddenId)
        queue.push(neighbor)
      })
    }
  })

  clusterSuppressedByAnchor.forEach((blockers, clusterId) => {
    suppressedNodeIds.add(clusterId)
    if (!nodeSuppressedBy.has(clusterId)) nodeSuppressedBy.set(clusterId, new Set())
    blockers.forEach((blocker) => nodeSuppressedBy.get(clusterId).add(blocker))
  })

  const layoutedNodes = layoutNodesHierarchically(
    [...baseNodes, ...clusterNodes],
    [...standardEdges, ...clusterEdges],
    centerKey
  )

  const layoutedNodeMap = new Map(layoutedNodes.map((node) => [node.id, node]))

  const suppressedNodes = {}
  for (const nodeId of suppressedNodeIds) {
    const node = layoutedNodeMap.get(nodeId)
    if (node) suppressedNodes[nodeId] = node
  }

  const visibleNodes = layoutedNodes.filter((node) => {
    if (suppressedNodeIds.has(node.id)) return false
    return true
  })

  const suppressedEdges = []
  const visibleStandardEdges = []
  const visibleClusterEdges = []

  const isEndpointHiddenOrSuppressed = (edge) => {
    const sourceKey = String(edge.source)
    const targetKey = String(edge.target)
    if (hiddenNodeIds.has(sourceKey) || hiddenNodeIds.has(targetKey)) return true
    if (suppressedNodeIds.has(sourceKey) || suppressedNodeIds.has(targetKey)) return true
    return false
  }

  for (const edge of standardEdges) {
    if (isEndpointHiddenOrSuppressed(edge)) {
      suppressedEdges.push(edge)
    } else {
      visibleStandardEdges.push(edge)
    }
  }

  for (const edge of clusterEdges) {
    if (isEndpointHiddenOrSuppressed(edge)) {
      suppressedEdges.push(edge)
    } else {
      visibleClusterEdges.push(edge)
    }
  }

  const finalEdges = [...visibleStandardEdges, ...visibleClusterEdges]

  return {
    nodes: visibleNodes,
    edges: finalEdges,
    suppressedNodes,
    suppressedEdges,
    nodeSuppressedBy: Object.fromEntries(
      [...nodeSuppressedBy.entries()].map(([nodeId, blockers]) => [nodeId, [...blockers]])
    ),
    hiddenNodeIds: Array.from(hiddenNodeIds),
  }
}

export function createAdHocEntityNode(clusterNode, entity, placedIds = []) {
  if (!clusterNode || !entity) return null

  const baseX = clusterNode?.position?.x ?? 0
  const baseY = clusterNode?.position?.y ?? 0
  const clusterWidth = clusterNode?.width ?? DEFAULT_CLUSTER_WIDTH
  const clusterHeight = clusterNode?.height ?? DEFAULT_CLUSTER_HEIGHT
  const entityId = String(entity.id)
  const normalizedPlaced = Array.isArray(placedIds)
    ? placedIds.map((value) => String(value))
    : []
  const placementIndex = normalizedPlaced.indexOf(entityId)

  const totalWidth = Math.max(normalizedPlaced.length - 1, 0) * CLUSTER_ENTITY_HORIZONTAL_SPACING
  const centerX = baseX + clusterWidth / 2
  const firstCenterX = centerX - totalWidth / 2
  const entityWidth = DEFAULT_ENTITY_WIDTH
  const x =
    placementIndex >= 0
      ? firstCenterX + placementIndex * CLUSTER_ENTITY_HORIZONTAL_SPACING - entityWidth / 2
      : centerX - entityWidth / 2
  const y = baseY + clusterHeight + CLUSTER_ENTITY_GAP

  return {
    id: entityId,
    type: 'entity',
    position: { x, y },
    data: {
      label: entity.name || `Entity ${entityId}`,
      typeName: entity?.type?.name || entity?.typeName || 'Entity',
      isCenter: false,
      isAdHoc: true,
      entityId,
    },
  }
}

export function positionEntitiesBelowCluster(nodes, clusterNode, placedIds = []) {
  if (!clusterNode || !Array.isArray(placedIds) || placedIds.length === 0) return nodes

  const order = placedIds.map((id) => String(id))
  const orderIndex = new Map(order.map((id, index) => [id, index]))

  const baseX = clusterNode?.position?.x ?? 0
  const baseY = clusterNode?.position?.y ?? 0
  const clusterWidth = clusterNode?.width ?? DEFAULT_CLUSTER_WIDTH
  const clusterHeight = clusterNode?.height ?? DEFAULT_CLUSTER_HEIGHT
  const startY = baseY + clusterHeight + CLUSTER_ENTITY_GAP

  const totalWidth = (order.length - 1) * CLUSTER_ENTITY_HORIZONTAL_SPACING
  const centerX = baseX + clusterWidth / 2
  const firstCenterX = centerX - totalWidth / 2

  let didChange = false
  const nextNodes = nodes.map((node) => {
    if (node.type !== 'entity' || !node.data?.isAdHoc) return node
    const index = orderIndex.get(String(node.id))
    if (index == null) return node

    const entityWidth = node?.width ?? DEFAULT_ENTITY_WIDTH
    const x = firstCenterX + index * CLUSTER_ENTITY_HORIZONTAL_SPACING - entityWidth / 2
    const y = startY

    if (node?.position?.x === x && node?.position?.y === y) return node
    didChange = true
    return {
      ...node,
      position: { x, y },
    }
  })

  return didChange ? nextNodes : nodes
}
