export const DEFAULT_CLUSTER_WIDTH = 220
export const DEFAULT_CLUSTER_HEIGHT = 160
export const DEFAULT_ENTITY_WIDTH = 220
export const DEFAULT_ENTITY_HEIGHT = 120
export const CLUSTER_ENTITY_GAP = 40
export const DEFAULT_CLUSTER_THRESHOLD = 5

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

  const spacingX = 220
  const spacingY = 200
  const groupGap = spacingX * 0.6
  const positionMap = new Map()

  groupedByLevel.forEach((groupMap, level) => {
    const groups = Array.from(groupMap.values()).map((group) => ({
      ...group,
      nodeIds: group.nodeIds.sort((a, b) => {
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

    if (orderedGroups.length === 1) {
      const [singleGroup] = orderedGroups
      const groupWidth = (singleGroup.nodeIds.length - 1) * spacingX
      const startX = -groupWidth / 2

      singleGroup.nodeIds.forEach((nodeId, index) => {
        const x = startX + index * spacingX
        const y = level * spacingY
        positionMap.set(nodeId, { x, y })
      })

      return
    }

    const centers = orderedGroups.map(() => 0)

    for (let i = 1; i < orderedGroups.length; i += 1) {
      const prevGroup = orderedGroups[i - 1]
      const currentGroup = orderedGroups[i]
      const prevWidth = Math.max(prevGroup.nodeIds.length - 1, 0) * spacingX
      const currentWidth = Math.max(currentGroup.nodeIds.length - 1, 0) * spacingX
      const distance = prevWidth / 2 + currentWidth / 2 + groupGap
      centers[i] = centers[i - 1] + distance
    }

    const minCenter = Math.min(...centers)
    const maxCenter = Math.max(...centers)
    const offset = (minCenter + maxCenter) / 2
    const alignedCenters = centers.map((center) => center - offset)

    orderedGroups.forEach((group, index) => {
      const groupWidth = (group.nodeIds.length - 1) * spacingX
      const start = alignedCenters[index] - groupWidth / 2

      group.nodeIds.forEach((nodeId, nodeIndex) => {
        const x = start + nodeIndex * spacingX
        const y = level * spacingY
        positionMap.set(nodeId, { x, y })
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
  const hiddenNodeIds = new Set()
  const consumedEdgeIds = new Set()

  const protectedNodeIds = new Set([centerKey])

  const clusterGroups = []

  groupedByTypeAndAnchor.forEach((group) => {
    if (!group?.edges?.length) return
    if (group.edges.length < clusterThreshold) return

    if (group.anchorId) protectedNodeIds.add(group.anchorId)
    clusterGroups.push(group)
  })

  clusterGroups.forEach(({ typeName, anchorId, edges: edgesForGroup }) => {
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

  const nodeSuppressedBy = new Map()
  const suppressedNodeIds = new Set()

  for (const edge of standardEdges) {
    const sourceHidden = hiddenNodeIds.has(edge.source)
    const targetHidden = hiddenNodeIds.has(edge.target)

    if (sourceHidden && !targetHidden) {
      suppressedNodeIds.add(edge.target)
      if (!nodeSuppressedBy.has(edge.target)) nodeSuppressedBy.set(edge.target, new Set())
      nodeSuppressedBy.get(edge.target).add(edge.source)
    }

    if (targetHidden && !sourceHidden) {
      suppressedNodeIds.add(edge.source)
      if (!nodeSuppressedBy.has(edge.source)) nodeSuppressedBy.set(edge.source, new Set())
      nodeSuppressedBy.get(edge.source).add(edge.target)
    }
  }

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

  for (const edge of standardEdges) {
    if (suppressedNodeIds.has(edge.source) || suppressedNodeIds.has(edge.target)) {
      suppressedEdges.push(edge)
    } else {
      visibleStandardEdges.push(edge)
    }
  }

  const finalEdges = [...visibleStandardEdges, ...clusterEdges]

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

export function createAdHocEntityNode(clusterNode, entity) {
  if (!clusterNode || !entity) return null

  const baseX = clusterNode?.position?.x ?? 0
  const baseY = clusterNode?.position?.y ?? 0
  const entityId = String(entity.id)

  return {
    id: entityId,
    type: 'entity',
    position: { x: baseX, y: baseY },
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
