
export const DEFAULT_CLUSTER_WIDTH = 220
export const DEFAULT_CLUSTER_HEIGHT = 160
export const DEFAULT_ENTITY_WIDTH = 220
export const DEFAULT_ENTITY_HEIGHT = 120
export const CLUSTER_ENTITY_GAP = 40
export const DEFAULT_CLUSTER_THRESHOLD = 5

const DEFAULT_RELATIONSHIP_LABEL = 'Related'

const HIERARCHY_HORIZONTAL_PADDING = 40
const HIERARCHY_VERTICAL_PADDING = 80
const LEVEL_HORIZONTAL_SPACING =
  Math.max(DEFAULT_ENTITY_WIDTH, DEFAULT_CLUSTER_WIDTH) + HIERARCHY_HORIZONTAL_PADDING
const LEVEL_VERTICAL_SPACING =
  Math.max(DEFAULT_ENTITY_HEIGHT, DEFAULT_CLUSTER_HEIGHT) + HIERARCHY_VERTICAL_PADDING
const CLUSTER_ENTITY_HORIZONTAL_SPACING = DEFAULT_ENTITY_WIDTH + CLUSTER_ENTITY_GAP

const PARENT_RELATION_PATTERN =
  /(part of|owned by|managed by|works for|reports to|child of|belongs to|member of|subsidiary of|division of|child)/i
const CHILD_RELATION_PATTERN =
  /(owns|manages|contains|has member|employs|parent of|parent|oversees|supervises|leads)/i
const SIBLING_RELATION_PATTERN =
  /(associated with|related to|partner|peer|sibling|affiliated with|connected to)/i

function normalizeNode(rawNode) {
  if (!rawNode) return null
  const id = String(rawNode.id ?? '')
  if (!id) return null

  const name = rawNode?.name || `Entity ${id}`
  const typeName = rawNode?.type?.name || rawNode?.typeName || 'Entity'

  return {
    ...rawNode,
    id,
    name,
    typeName,
  }
}

function determineDirection(source, target, relationshipType) {
  if (!relationshipType || !source || !target) return null
  if (isChildRelation(relationshipType)) {
    return { parent: source, child: target }
  }
  if (isParentRelation(relationshipType)) {
    return { parent: target, child: source }
  }
  return null
}

function normalizeEdge(rawEdge, index = 0) {
  if (!rawEdge) return null

  const source = String(rawEdge?.source ?? rawEdge?.from ?? '')
  const target = String(rawEdge?.target ?? rawEdge?.to ?? '')
  if (!source || !target || source === target) return null

  const id =
    rawEdge?.id != null && rawEdge.id !== ''
      ? String(rawEdge.id)
      : `edge-${index}-${source}-${target}`

  const relationshipTypeRaw =
    rawEdge?.relationshipType ||
    rawEdge?.typeName ||
    rawEdge?.type?.name ||
    rawEdge?.type?.label ||
    rawEdge?.type?.from_name ||
    rawEdge?.type?.fromName ||
    rawEdge?.type?.to_name ||
    rawEdge?.type?.toName ||
    rawEdge?.data?.relationshipType ||
    rawEdge?.data?.typeName ||
    rawEdge?.data?.type?.name ||
    rawEdge?.data?.type?.label ||
    rawEdge?.label ||
    ''

  const relationshipType = String(relationshipTypeRaw || '').trim()
  const label = relationshipType || DEFAULT_RELATIONSHIP_LABEL
  const direction = determineDirection(source, target, relationshipType)

  return {
    id,
    source,
    target,
    relationshipType,
    label,
    parentId: direction?.parent ?? null,
    childId: direction?.child ?? null,
    raw: rawEdge,
  }
}

function addAdjacencyEntry(adjacency, nodeId, entry) {
  if (!nodeId) return
  if (!adjacency.has(nodeId)) adjacency.set(nodeId, [])
  adjacency.get(nodeId).push(entry)
}

function buildAdjacency(edges) {
  const adjacency = new Map()
  edges.forEach((edge) => {
    if (!edge) return
    addAdjacencyEntry(adjacency, edge.source, {
      other: edge.target,
      edge,
    })
    addAdjacencyEntry(adjacency, edge.target, {
      other: edge.source,
      edge,
    })
  })
  return adjacency
}

function computeGraphMeta(centerId, edges) {
  const levels = new Map()
  const meta = new Map()
  if (!centerId) return { levels, meta }

  const adjacency = buildAdjacency(edges)
  levels.set(centerId, 0)
  meta.set(centerId, { level: 0, parentId: null, relationshipType: null })

  const queue = [centerId]
  while (queue.length) {
    const current = queue.shift()
    const currentLevel = levels.get(current) ?? 0
    const neighbors = adjacency.get(current) || []

    neighbors.forEach(({ other, edge }) => {
      if (!other) return
      const existing = levels.get(other)
      const relationshipType = edge?.relationshipType || edge?.label || DEFAULT_RELATIONSHIP_LABEL

      let nextLevel = currentLevel + 1
      let parentId = current

      if (edge?.parentId && edge?.childId) {
        if (edge.parentId === current && edge.childId === other) {
          nextLevel = currentLevel + 1
          parentId = current
        } else if (edge.childId === current && edge.parentId === other) {
          nextLevel = currentLevel - 1
          parentId = other
        } else if (edge.parentId === other && edge.childId === current) {
          nextLevel = currentLevel - 1
          parentId = other
        } else if (edge.childId === other && edge.parentId === current) {
          nextLevel = currentLevel + 1
          parentId = current
        }
      } else if (relationshipType && isParentRelation(relationshipType)) {
        nextLevel = currentLevel - 1
        parentId = other
      }

      if (existing == null) {
        levels.set(other, nextLevel)
        meta.set(other, {
          level: nextLevel,
          parentId,
          relationshipType,
        })
        queue.push(other)
        return
      }

      if (Math.abs(nextLevel) < Math.abs(existing)) {
        levels.set(other, nextLevel)
        meta.set(other, {
          level: nextLevel,
          parentId,
          relationshipType,
        })
      }
    })
  }

  return { levels, meta }
}

function groupChildrenByRelationship(edges, threshold) {
  const grouped = new Map()
  edges.forEach((edge) => {
    if (!edge?.parentId || !edge?.childId) return
    const parentId = edge.parentId
    const relationshipType = edge.label || DEFAULT_RELATIONSHIP_LABEL
    if (!grouped.has(parentId)) grouped.set(parentId, new Map())
    const byType = grouped.get(parentId)
    const key = relationshipType || DEFAULT_RELATIONSHIP_LABEL
    if (!byType.has(key)) byType.set(key, new Set())
    byType.get(key).add(edge.childId)
  })

  const clusterDefinitions = []
  grouped.forEach((byType, parentId) => {
    byType.forEach((childSet, relationshipType) => {
      if (childSet.size < threshold) return
      const slug = slugifyTypeName(relationshipType)
      const clusterId = `cluster-${parentId}-${slug}`
      clusterDefinitions.push({
        id: clusterId,
        parentId: String(parentId),
        relationshipType,
        containedIds: Array.from(childSet, (value) => String(value)),
      })
    })
  })

  return clusterDefinitions
}

function createEntityNodeDefinition(rawNode, { isCenter = false } = {}) {
  const id = String(rawNode.id)
  const label = rawNode?.name || `Entity ${id}`
  const typeName = rawNode?.typeName || 'Entity'

  return {
    id,
    type: 'entity',
    width: DEFAULT_ENTITY_WIDTH,
    height: DEFAULT_ENTITY_HEIGHT,
    position: { x: 0, y: 0 },
    data: {
      label,
      typeName,
      entityId: id,
      isCenter,
    },
  }
}

function createClusterNodeDefinition(cluster, nodeSummaries) {
  const relationshipType = cluster.relationshipType || DEFAULT_RELATIONSHIP_LABEL
  return {
    id: cluster.id,
    type: 'cluster',
    width: DEFAULT_CLUSTER_WIDTH,
    height: DEFAULT_CLUSTER_HEIGHT,
    position: { x: 0, y: 0 },
    data: {
      label: relationshipType,
      relationshipType,
      containedIds: cluster.containedIds,
      count: cluster.containedIds.length,
      sourceId: cluster.parentId,
      placedEntityIds: [],
      allNodes: nodeSummaries,
    },
  }
}

function ensureAllLevels(levels, nodes, centerId) {
  const normalizedCenter = centerId != null ? String(centerId) : null
  nodes.forEach((node) => {
    if (!levels.has(node.id)) {
      if (node.id === normalizedCenter) {
        levels.set(node.id, 0)
      } else {
        levels.set(node.id, 1)
      }
    }
  })
}

function buildLevelGroups(levels, nodes) {
  let minLevel = 0
  levels.forEach((value) => {
    if (value < minLevel) minLevel = value
  })
  const levelOffset = minLevel < 0 ? -minLevel : 0

  const groups = new Map()
  nodes.forEach((node) => {
    const rawLevel = levels.get(node.id) ?? 0
    const level = rawLevel + levelOffset
    if (!groups.has(level)) groups.set(level, [])
    groups.get(level).push(node)
  })

  groups.forEach((entries) => {
    entries.sort((a, b) => {
      const aLabel = a?.data?.label || a.id
      const bLabel = b?.data?.label || b.id
      return aLabel.localeCompare(bLabel)
    })
  })

  return { groups, levelOffset }
}

function assignPositions(groups) {
  const positions = new Map()
  let globalMinX = Infinity

  groups.forEach((nodesAtLevel, level) => {
    const totalWidth = (nodesAtLevel.length - 1) * LEVEL_HORIZONTAL_SPACING
    const startX = -totalWidth / 2
    nodesAtLevel.forEach((node, index) => {
      const x = startX + index * LEVEL_HORIZONTAL_SPACING
      const y = level * LEVEL_VERTICAL_SPACING
      positions.set(node.id, { x, y, level, levelIndex: index })
      if (x < globalMinX) globalMinX = x
    })
  })

  const xOffset = Number.isFinite(globalMinX) && globalMinX < 0 ? -globalMinX : 0
  const adjusted = new Map()
  positions.forEach((value, key) => {
    adjusted.set(key, {
      x: value.x + xOffset,
      y: value.y,
      level: value.level,
      levelIndex: value.levelIndex,
    })
  })

  return adjusted
}

export function isParentRelation(typeName) {
  if (!typeName) return false
  return PARENT_RELATION_PATTERN.test(String(typeName))
}

export function isChildRelation(typeName) {
  if (!typeName) return false
  return CHILD_RELATION_PATTERN.test(String(typeName))
}

function isSiblingRelation(typeName) {
  if (!typeName) return false
  return SIBLING_RELATION_PATTERN.test(String(typeName))
}

function buildRelationshipAdjacency(edges) {
  const adjacency = new Map()
  edges.forEach((edge) => {
    if (!edge) return
    const source = String(edge.source)
    const target = String(edge.target)
    if (!source || !target || source === target) return
    if (!adjacency.has(source)) adjacency.set(source, [])
    if (!adjacency.has(target)) adjacency.set(target, [])
    adjacency.get(source).push(edge)
    adjacency.get(target).push(edge)
  })
  return adjacency
}

function buildLevelsFromEdges(centerKey, edges) {
  const adjacency = buildRelationshipAdjacency(edges)
  const levels = new Map()
  if (!centerKey) return levels
  levels.set(centerKey, 0)

  const queue = [centerKey]
  while (queue.length) {
    const current = queue.shift()
    const currentLevel = levels.get(current) ?? 0
    const relatedEdges = adjacency.get(current) || []

    relatedEdges.forEach((edge) => {
      const other = edge.source === current ? edge.target : edge.source
      if (!other) return
      const relationshipType = edge?.data?.relationshipType || edge?.label || ''
      const parentId = edge?.data?.parentId ?? edge?.parentId ?? null
      const childId = edge?.data?.childId ?? edge?.childId ?? null

      let nextLevel = currentLevel + 1
      if (parentId && childId) {
        if (current === parentId && other === childId) {
          nextLevel = currentLevel + 1
        } else if (current === childId && other === parentId) {
          nextLevel = currentLevel - 1
        }
      } else if (isParentRelation(relationshipType)) {
        nextLevel = currentLevel - 1
      } else if (isSiblingRelation(relationshipType)) {
        nextLevel = currentLevel
      }

      if (!levels.has(other)) {
        levels.set(other, nextLevel)
        queue.push(other)
      } else {
        const existing = levels.get(other)
        if (Math.abs(nextLevel) < Math.abs(existing)) {
          levels.set(other, nextLevel)
        }
      }
    })
  }

  return levels
}

export function layoutNodesHierarchically(nodes, edges, centerId) {
  const normalizedNodes = Array.isArray(nodes)
    ? nodes.map((node) => ({
        ...node,
        id: String(node.id),
        data: { ...node.data },
      }))
    : []

  if (!normalizedNodes.length) return nodes

  const centerKey =
    centerId != null ? String(centerId) : normalizedNodes[0]?.id ?? null
  if (!centerKey) return nodes

  const normalizedEdges = Array.isArray(edges)
    ? edges
        .map((edge, index) => {
          if (!edge) return null
          const source = String(edge.source)
          const target = String(edge.target)
          if (!source || !target || source === target) return null
          const relationshipType =
            edge?.data?.relationshipType || edge?.data?.typeName || edge?.label || ''
          const parentIdRaw =
            edge?.data?.parentId ?? edge?.parentId ?? edge?.data?.parent ?? null
          const childIdRaw = edge?.data?.childId ?? edge?.childId ?? null
          const parentId = parentIdRaw != null ? String(parentIdRaw) : null
          const childId = childIdRaw != null ? String(childIdRaw) : null
          return {
            id: edge?.id != null ? String(edge.id) : `edge-${index}`,
            source,
            target,
            label: edge?.label || relationshipType || DEFAULT_RELATIONSHIP_LABEL,
            data: {
              relationshipType: relationshipType || DEFAULT_RELATIONSHIP_LABEL,
              parentId,
              childId,
            },
            parentId,
            childId,
          }
        })
        .filter(Boolean)
    : []

  const levels = buildLevelsFromEdges(centerKey, normalizedEdges)
  ensureAllLevels(levels, normalizedNodes, centerKey)

  const { groups } = buildLevelGroups(levels, normalizedNodes)
  const positions = assignPositions(groups)

  return normalizedNodes.map((node) => {
    const placement = positions.get(node.id) || { x: 0, y: 0, level: 0, levelIndex: 0 }
    return {
      ...node,
      position: { x: placement.x, y: placement.y },
      data: {
        ...node.data,
        level: placement.level,
        levelIndex: placement.levelIndex,
      },
    }
  })
}

export function slugifyTypeName(name) {
  return String(name ?? 'group')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function summarizeNodes(nodeMap) {
  return Array.from(nodeMap.values()).map((node) => ({
    id: node.id,
    name: node.name,
    typeName: node.typeName,
  }))
}

export function buildReactFlowGraph(data, entityId, clusterThreshold = DEFAULT_CLUSTER_THRESHOLD) {
  const centerId = entityId != null ? String(entityId) : null
  const rawNodes = Array.isArray(data?.nodes) ? data.nodes : []
  const rawEdges = Array.isArray(data?.edges) ? data.edges : []

  const nodeMap = new Map()
  rawNodes.forEach((rawNode) => {
    const normalized = normalizeNode(rawNode)
    if (!normalized) return
    nodeMap.set(normalized.id, normalized)
  })

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

  if (!nodeMap.has(centerId)) {
    const fallback = normalizeNode(rawNodes[0])
    if (fallback) {
      nodeMap.set(centerId, { ...fallback, id: centerId })
    } else {
      nodeMap.set(centerId, {
        id: centerId,
        name: `Entity ${centerId}`,
        typeName: 'Entity',
      })
    }
  }

  const normalizedEdges = rawEdges
    .map((edge, index) => normalizeEdge(edge, index))
    .filter(Boolean)

  const { levels, meta } = computeGraphMeta(centerId, normalizedEdges)
  ensureAllLevels(levels, Array.from(nodeMap.values()), centerId)

  const clusterDefinitions = groupChildrenByRelationship(normalizedEdges, clusterThreshold)
  const nodeSummaries = summarizeNodes(nodeMap)

  const suppressedNodeIds = new Set()
  const hiddenNodeIds = new Set()
  const nodeSuppressedBy = new Map()
  const suppressedNodeDefinitions = new Map()

  clusterDefinitions.forEach((cluster) => {
    cluster.containedIds.forEach((childId) => {
      const childKey = String(childId)
      suppressedNodeIds.add(childKey)
      hiddenNodeIds.add(childKey)
      const blockers = nodeSuppressedBy.get(childKey) || []
      blockers.push(cluster.id)
      nodeSuppressedBy.set(childKey, blockers)
      const rawNode = nodeMap.get(childKey)
      if (rawNode) {
        suppressedNodeDefinitions.set(
          childKey,
          createEntityNodeDefinition(rawNode, { isCenter: childKey === centerId })
        )
      }
    })
  })

  const clusterNodes = clusterDefinitions.map((cluster) =>
    createClusterNodeDefinition(cluster, nodeSummaries)
  )

  const visibleEntityNodes = []
  nodeMap.forEach((rawNode, id) => {
    const isCenter = id === centerId
    const definition = createEntityNodeDefinition(rawNode, { isCenter })
    if (suppressedNodeIds.has(id)) return
    visibleEntityNodes.push(definition)
  })

  const standardEdges = normalizedEdges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: 'smoothstep',
    animated: true,
    label: edge.label || DEFAULT_RELATIONSHIP_LABEL,
    data: {
      relationshipType: edge.relationshipType || edge.label || DEFAULT_RELATIONSHIP_LABEL,
      parentId: edge.parentId ?? null,
      childId: edge.childId ?? null,
    },
    parentId: edge.parentId ?? null,
    childId: edge.childId ?? null,
    sourceHandle: 'bottom',
    targetHandle: 'top',
  }))

  const suppressedEdges = []
  const visibleStandardEdges = []
  standardEdges.forEach((edge) => {
    if (suppressedNodeIds.has(edge.source) || suppressedNodeIds.has(edge.target)) {
      suppressedEdges.push(edge)
    } else {
      visibleStandardEdges.push(edge)
    }
  })

  const clusterEdges = clusterDefinitions.map((cluster) => ({
    id: `cluster-edge-${cluster.id}`,
    source: cluster.parentId,
    target: cluster.id,
    type: 'smoothstep',
    animated: false,
    label: cluster.relationshipType || DEFAULT_RELATIONSHIP_LABEL,
    data: {
      relationshipType: cluster.relationshipType || DEFAULT_RELATIONSHIP_LABEL,
      parentId: cluster.parentId,
      childId: cluster.id,
      isClusterEdge: true,
    },
    parentId: cluster.parentId,
    childId: cluster.id,
    sourceHandle: 'bottom',
    targetHandle: 'top',
  }))

  const visibleEdges = [...visibleStandardEdges, ...clusterEdges]

  const layoutNodesInput = [...visibleEntityNodes, ...clusterNodes]
  const layoutedNodes = layoutNodesHierarchically(layoutNodesInput, visibleEdges, centerId)
  const layoutedNodeMap = new Map(layoutedNodes.map((node) => [node.id, node]))

  const suppressedNodes = {}
  suppressedNodeDefinitions.forEach((node, id) => {
    const blockers = nodeSuppressedBy.get(id) || []
    const anchorId = blockers.find((blocker) => layoutedNodeMap.has(blocker))
    const anchorNode =
      (anchorId && layoutedNodeMap.get(anchorId)) ||
      (meta.get(id)?.parentId && layoutedNodeMap.get(meta.get(id)?.parentId)) ||
      layoutedNodeMap.get(centerId)
    const baseX = anchorNode?.position?.x ?? 0
    const baseY = anchorNode?.position?.y ?? 0
    suppressedNodes[id] = {
      ...node,
      position: {
        x: baseX,
        y: baseY + DEFAULT_CLUSTER_HEIGHT + CLUSTER_ENTITY_GAP,
      },
    }
  })

  const nodeSuppressedByObject = {}
  nodeSuppressedBy.forEach((value, key) => {
    nodeSuppressedByObject[key] = value.map(String)
  })

  return {
    nodes: layoutedNodes,
    edges: visibleEdges,
    suppressedNodes,
    suppressedEdges,
    nodeSuppressedBy: nodeSuppressedByObject,
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
