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
