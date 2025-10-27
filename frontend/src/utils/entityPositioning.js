export const DEFAULT_CLUSTER_WIDTH = 220
export const DEFAULT_CLUSTER_HEIGHT = 160
export const DEFAULT_ENTITY_WIDTH = 220
export const DEFAULT_ENTITY_HEIGHT = 120
export const CLUSTER_ENTITY_GAP = 40
export const DEFAULT_CLUSTER_THRESHOLD = 5

const CLUSTER_ENTITY_HORIZONTAL_SPACING = DEFAULT_ENTITY_WIDTH + CLUSTER_ENTITY_GAP

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

  for (const [type, edgesForType] of groupedByType.entries()) {
    if (edgesForType.length >= clusterThreshold) {
      const nodeIds = new Set()
      edgesForType.forEach((e) => {
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

  const layoutedNodes = layoutNodesHierarchically(
    [...baseNodes, ...clusterNodes],
    [...standardEdges, ...clusterEdges],
    centerKey
  )

  return { nodes: layoutedNodes, edges: [...standardEdges, ...clusterEdges] }
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
