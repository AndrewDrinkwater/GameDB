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

const HIERARCHY_INDEX_SPACING = 260
const HIERARCHY_LEVEL_SPACING_Y = 200

const DEFAULT_RELATIONSHIP_LABEL = 'Relationship'

function normalizeEdge(edge, index = 0) {
  const source = String(edge.source)
  const target = String(edge.target)
  const typeName = edge?.type?.name || edge?.label || DEFAULT_RELATIONSHIP_LABEL

  return {
    id: edge?.id != null ? String(edge.id) : `${source}-${target}-${index}`,
    source,
    target,
    relationshipType: typeName,
  }
}

function createEntityNode(id, node, meta, position) {
  const label = node?.name || `Entity ${id}`
  const typeName = node?.type?.name || node?.typeName || 'Entity'

  return {
    id,
    type: 'entity',
    position,
    data: {
      label,
      typeName,
      entityId: id,
      isCenter: meta.level === 0,
      level: meta.level,
      levelIndex: meta.levelIndex ?? 0,
      parentId: meta.parentId,
    },
  }
}

function createClusterNode(definition, position, allNodes) {
  const { id, parentId, relationshipType, containedIds, level, levelIndex, sourceId } = definition
  const count = containedIds.length
  const label = `${relationshipType} (${count})`

  return {
    id,
    type: 'cluster',
    position,
    data: {
      label,
      relationshipType,
      count,
      containedIds,
      sourceId,
      level,
      levelIndex,
      parentId,
      allNodes,
      placedEntityIds: [],
    },
  }
}

function assignPositions(entries) {
  const positionMap = new Map()

  entries.forEach((items, level) => {
    const sorted = [...items].sort((a, b) => {
      const parentCompare = (a.parentId || '').localeCompare(b.parentId || '', undefined, {
        sensitivity: 'base',
      })
      if (parentCompare !== 0) return parentCompare

      return (a.label || a.id).localeCompare(b.label || b.id, undefined, { sensitivity: 'base' })
    })

    sorted.forEach((entry, index) => {
      positionMap.set(entry.id, {
        x: index * HIERARCHY_INDEX_SPACING,
        y: level * HIERARCHY_LEVEL_SPACING_Y,
        levelIndex: index,
      })
    })
  })

  return positionMap
}

export function buildReactFlowGraph(
  data,
  entityId,
  clusterThreshold = DEFAULT_CLUSTER_THRESHOLD
) {
  const centerId = String(entityId)
  const rawNodes = Array.isArray(data?.nodes) ? data.nodes : []
  const rawEdges = Array.isArray(data?.edges) ? data.edges : []

  if (!centerId) {
    return {
      nodes: [],
      edges: [],
      suppressedNodes: {},
      suppressedEdges: [],
      nodeSuppressedBy: {},
      hiddenNodeIds: [],
    }
  }

  const nodeMap = new Map(
    rawNodes.map((node) => [String(node.id), { ...node, typeName: node?.type?.name || node?.typeName }])
  )

  if (!nodeMap.has(centerId)) {
    const fallback = rawNodes[0]
    if (fallback) {
      nodeMap.set(centerId, {
        ...fallback,
        id: centerId,
        name: fallback?.name || `Entity ${centerId}`,
        typeName: fallback?.type?.name || fallback?.typeName,
      })
    } else {
      nodeMap.set(centerId, { id: centerId, name: `Entity ${centerId}`, typeName: 'Entity' })
    }
  }

  const parsedEdges = rawEdges.map((edge, index) => normalizeEdge(edge, index))

  const adjacency = new Map()
  parsedEdges.forEach((edge) => {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, [])
    if (!adjacency.has(edge.target)) adjacency.set(edge.target, [])

    adjacency.get(edge.source).push({ otherId: edge.target, edge })
    adjacency.get(edge.target).push({ otherId: edge.source, edge })
  })

  const metaMap = new Map()
  metaMap.set(centerId, {
    level: 0,
    parentId: null,
    relationshipType: null,
    edgeId: null,
  })

  const queue = [centerId]
  while (queue.length) {
    const currentId = queue.shift()
    const currentMeta = metaMap.get(currentId)
    const neighbors = adjacency.get(currentId) || []

    neighbors.forEach(({ otherId, edge }) => {
      if (metaMap.has(otherId)) return
      const nextLevel = currentMeta.level + 1
      metaMap.set(otherId, {
        level: nextLevel,
        parentId: currentId,
        relationshipType: edge.relationshipType,
        edgeId: edge.id,
      })
      queue.push(otherId)
    })
  }

  const childrenByParent = new Map()
  metaMap.forEach((meta, id) => {
    if (!meta.parentId) return
    if (!childrenByParent.has(meta.parentId)) childrenByParent.set(meta.parentId, [])
    childrenByParent.get(meta.parentId).push({ id, relationshipType: meta.relationshipType })
  })

  const clusterDefinitions = []
  const nodesHiddenByCluster = new Set()

  childrenByParent.forEach((children, parentId) => {
    const grouped = new Map()
    children.forEach(({ id, relationshipType }) => {
      const key = relationshipType || DEFAULT_RELATIONSHIP_LABEL
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key).push(String(id))
    })

    grouped.forEach((ids, relationshipType) => {
      if (ids.length < clusterThreshold) return

      const clusterId = `cluster-${parentId}-${slugifyTypeName(relationshipType)}`
      const parentMeta = metaMap.get(parentId)
      const level = (parentMeta?.level ?? 0) + 1

      clusterDefinitions.push({
        id: clusterId,
        parentId,
        relationshipType,
        containedIds: ids,
        level,
        levelIndex: 0,
        sourceId: parentId,
      })

      ids.forEach((childId) => nodesHiddenByCluster.add(childId))
    })
  })

  const hiddenNodeIds = new Set()
  const suppressedNodeIds = new Set()
  const blockersMap = new Map()

  const traverseHiddenSubtree = (nodeId, activeBlockers = []) => {
    if (hiddenNodeIds.has(nodeId)) return
    hiddenNodeIds.add(nodeId)

    const children = childrenByParent.get(nodeId) || []
    children.forEach(({ id: childId }) => {
      const nextBlockers = new Set([nodeId, ...activeBlockers])
      if (!blockersMap.has(childId)) blockersMap.set(childId, new Set())
      nextBlockers.forEach((value) => blockersMap.get(childId).add(value))

      if (hiddenNodeIds.has(childId)) return
      if (!nodesHiddenByCluster.has(childId)) suppressedNodeIds.add(childId)
      traverseHiddenSubtree(childId, [...nextBlockers])
    })
  }

  nodesHiddenByCluster.forEach((hiddenRootId) => {
    traverseHiddenSubtree(hiddenRootId, [hiddenRootId])
  })

  const levelEntries = new Map()

  const registerLevelEntry = (level, entry) => {
    if (!levelEntries.has(level)) levelEntries.set(level, [])
    levelEntries.get(level).push(entry)
  }

  metaMap.forEach((meta, id) => {
    const node = nodeMap.get(id)
    registerLevelEntry(meta.level, {
      id,
      parentId: meta.parentId,
      label: node?.name || `Entity ${id}`,
    })
  })

  clusterDefinitions.forEach((cluster) => {
    registerLevelEntry(cluster.level, {
      id: cluster.id,
      parentId: cluster.parentId,
      label: cluster.relationshipType,
    })
  })

  const positionLookup = assignPositions(levelEntries)

  const visibleNodes = []
  const suppressedNodes = {}

  metaMap.forEach((meta, id) => {
    const positionInfo =
      positionLookup.get(id) || { x: 0, y: meta.level * HIERARCHY_LEVEL_SPACING_Y, levelIndex: 0 }
    const nodeData = nodeMap.get(id) || { id, name: `Entity ${id}`, typeName: 'Entity' }
    const enrichedMeta = {
      ...meta,
      levelIndex: positionInfo.levelIndex ?? 0,
    }

    const node = createEntityNode(id, nodeData, enrichedMeta, {
      x: positionInfo.x,
      y: positionInfo.y,
    })

    if (hiddenNodeIds.has(id)) {
      if (suppressedNodeIds.has(id)) {
        suppressedNodes[id] = node
      }
    } else {
      visibleNodes.push(node)
    }
  })

  const clusterNodes = clusterDefinitions.map((cluster) => {
    const positionInfo = positionLookup.get(cluster.id) || {
      x: 0,
      y: cluster.level * HIERARCHY_LEVEL_SPACING_Y,
      levelIndex: 0,
    }

    const definition = {
      ...cluster,
      levelIndex: positionInfo.levelIndex ?? 0,
    }

    return createClusterNode(definition, {
      x: positionInfo.x,
      y: positionInfo.y,
    }, rawNodes)
  })

  const visibleNodeIds = new Set(visibleNodes.map((node) => node.id))

  const visibleEdges = []
  const suppressedEdges = []

  const collectEdge = (edge) => {
    const sourceHidden = hiddenNodeIds.has(edge.source) && !visibleNodeIds.has(edge.source)
    const targetHidden = hiddenNodeIds.has(edge.target) && !visibleNodeIds.has(edge.target)

    if (sourceHidden || targetHidden) {
      suppressedEdges.push(edge)
    } else {
      visibleEdges.push(edge)
    }
  }

  metaMap.forEach((meta, id) => {
    const parentId = meta.parentId
    if (!parentId) return

    const edgeId = `edge-${parentId}-${id}`
    const edge = {
      id: edgeId,
      source: parentId,
      target: id,
      type: 'smoothstep',
      animated: true,
      label: meta.relationshipType || DEFAULT_RELATIONSHIP_LABEL,
      data: { relationshipType: meta.relationshipType || DEFAULT_RELATIONSHIP_LABEL },
      style: { strokeWidth: 1.5 },
      sourceHandle: 'bottom',
      targetHandle: 'top',
    }

    collectEdge(edge)
  })

  clusterNodes.forEach((clusterNode) => {
    const { sourceId, relationshipType, count } = clusterNode.data
    const edgeId = `edge-${sourceId}-${clusterNode.id}`

    collectEdge({
      id: edgeId,
      source: sourceId,
      target: clusterNode.id,
      type: 'smoothstep',
      animated: false,
      label: `${relationshipType} (${count})`,
      data: { relationshipType },
      style: { strokeWidth: 1.5 },
      sourceHandle: 'bottom',
      targetHandle: 'top',
    })
  })

  const nodeSuppressedBy = Object.fromEntries(
    [...blockersMap.entries()].map(([nodeId, blockers]) => [nodeId, [...blockers].map(String)])
  )

  return {
    nodes: [...visibleNodes, ...clusterNodes],
    edges: visibleEdges,
    suppressedNodes,
    suppressedEdges,
    nodeSuppressedBy,
    hiddenNodeIds: Array.from(hiddenNodeIds, String),
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
