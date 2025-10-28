
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

export function isEntityOnActivePath(entityId, sourceEntityId, edges) {
  if (!entityId || !sourceEntityId || !Array.isArray(edges)) return false

  const visited = new Set()
  const stack = [String(sourceEntityId)]
  const normalizedTarget = String(entityId)

  while (stack.length) {
    const current = stack.pop()
    if (current === normalizedTarget) return true
    if (visited.has(current)) continue
    visited.add(current)

    edges.forEach((edge) => {
      if (!edge) return
      const source = edge?.source != null ? String(edge.source) : null
      const target = edge?.target != null ? String(edge.target) : null
      if (!source || !target) return

      let next = null
      if (source === current) {
        next = target
      } else if (target === current) {
        next = source
      }

      if (next != null && !visited.has(next)) {
        stack.push(next)
      }
    })
  }

  return false
}

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

function determineDirection(relationship, currentEntityId) {
  if (!relationship) return { parentId: null, childId: null }

  void currentEntityId

  const fromEntityId =
    relationship?.fromEntityId != null ? String(relationship.fromEntityId) : null
  const toEntityId =
    relationship?.toEntityId != null ? String(relationship.toEntityId) : null
  const relationshipType = relationship?.relationshipType

  let parentId = fromEntityId && toEntityId ? fromEntityId : null
  let childId = fromEntityId && toEntityId ? toEntityId : null

  const relationshipLabel = (() => {
    if (!relationshipType) return ''
    if (typeof relationshipType === 'string') return relationshipType.toLowerCase()
    const rawLabel =
      relationshipType?.label ||
      relationshipType?.name ||
      relationshipType?.from_label ||
      relationshipType?.to_label ||
      ''
    return String(rawLabel).toLowerCase()
  })()

  if (!parentId && !childId && fromEntityId && toEntityId && relationshipLabel) {
    if (PARENT_RELATION_PATTERN.test(relationshipLabel)) {
      parentId = toEntityId
      childId = fromEntityId
    } else if (CHILD_RELATION_PATTERN.test(relationshipLabel)) {
      parentId = fromEntityId
      childId = toEntityId
    }
  }

  return {
    parentId,
    childId,
  }
}

function normalizeEdge(rawEdge, currentEntityId) {
  if (!rawEdge) return null

  const fromEntityIdRaw =
    rawEdge?.from_entity ??
    rawEdge?.fromEntityId ??
    rawEdge?.from ??
    rawEdge?.source ??
    rawEdge?.sourceId ??
    null
  const toEntityIdRaw =
    rawEdge?.to_entity ??
    rawEdge?.toEntityId ??
    rawEdge?.to ??
    rawEdge?.target ??
    rawEdge?.targetId ??
    null

  const fromEntityId = fromEntityIdRaw != null ? String(fromEntityIdRaw) : null
  const toEntityId = toEntityIdRaw != null ? String(toEntityIdRaw) : null

  if (!fromEntityId || !toEntityId || fromEntityId === toEntityId) return null

  const id =
    rawEdge?.id != null && rawEdge.id !== ''
      ? String(rawEdge.id)
      : `edge-${fromEntityId}-${toEntityId}`

  const relationshipType =
    rawEdge?.relationshipType ??
    rawEdge?.type ??
    rawEdge?.data?.relationshipType ??
    null

  const normalizedRelationship = {
    id,
    fromEntityId,
    toEntityId,
    relationshipType,
  }

  const { parentId, childId } = determineDirection(
    normalizedRelationship,
    currentEntityId
  )

  const currentId = currentEntityId != null ? String(currentEntityId) : null

  const baseLabel = (() => {
    if (!relationshipType) {
      return (
        rawEdge?.label ||
        rawEdge?.typeName ||
        rawEdge?.data?.typeName ||
        DEFAULT_RELATIONSHIP_LABEL
      )
    }

    if (typeof relationshipType === 'string') {
      return relationshipType || DEFAULT_RELATIONSHIP_LABEL
    }

    if (currentId && currentId === fromEntityId) {
      return (
        relationshipType?.from_label ||
        relationshipType?.label ||
        relationshipType?.name ||
        DEFAULT_RELATIONSHIP_LABEL
      )
    }

    if (currentId && currentId === toEntityId) {
      return (
        relationshipType?.to_label ||
        relationshipType?.label ||
        relationshipType?.name ||
        DEFAULT_RELATIONSHIP_LABEL
      )
    }

    return (
      relationshipType?.label ||
      relationshipType?.name ||
      DEFAULT_RELATIONSHIP_LABEL
    )
  })()

  const normalizedLabel =
    String(baseLabel || DEFAULT_RELATIONSHIP_LABEL).trim() || DEFAULT_RELATIONSHIP_LABEL

  const normalizedTypeName = (() => {
    if (!relationshipType) return null
    if (typeof relationshipType === 'string') return relationshipType
    return (
      relationshipType?.name ||
      relationshipType?.label ||
      relationshipType?.from_label ||
      relationshipType?.to_label ||
      null
    )
  })()

  const normalizedTypeId =
    relationshipType && typeof relationshipType === 'object'
      ? relationshipType?.id ?? null
      : null

  return {
    id,
    source: parentId ?? fromEntityId,
    target: childId ?? toEntityId,
    parentId,
    childId,
    label: normalizedLabel,
    typeName: normalizedTypeName ?? null,
    typeId: normalizedTypeId ?? null,
    fromEntityId,
    toEntityId,
    relationshipType,
    relationshipLabel: normalizedLabel,
    raw: rawEdge,
  }
}

function groupChildrenByRelationship(
  nodes,
  edges,
  threshold = DEFAULT_CLUSTER_THRESHOLD,
  currentEntityId = null
) {
  const clusters = []
  const suppressedNodes = new Map()
  const clusterEdges = []
  const edgesToRemove = new Set()

  const normalizedCurrentId =
    currentEntityId != null ? String(currentEntityId) : null

  if (!Array.isArray(edges) || !edges.length) {
    return { clusters, suppressedNodes, edges: edges || [] }
  }

  const nodeLookup = new Map(
    (Array.isArray(nodes) ? nodes : []).map((node) => [String(node?.id ?? ''), node])
  )

  const grouped = new Map()
  edges.forEach((edge) => {
    if (!edge) return
    const parentIdRaw = edge.parentId ?? edge.source ?? null
    const childIdRaw = edge.childId ?? edge.target ?? null
    if (!parentIdRaw || !childIdRaw) return

    const parentId = String(parentIdRaw)
    const childId = String(childIdRaw)
    if (!parentId || !childId || parentId === childId) return

    const label =
      String(edge.relationshipLabel || edge.label || DEFAULT_RELATIONSHIP_LABEL)
        .trim() || DEFAULT_RELATIONSHIP_LABEL
    const typeName =
      (edge.typeName && String(edge.typeName).trim()) ||
      (typeof edge.relationshipType === 'object'
        ? String(
            edge.relationshipType?.name ||
              edge.relationshipType?.label ||
              edge.relationshipType?.from_label ||
              edge.relationshipType?.to_label ||
              ''
          ).trim()
        : null) ||
      null
    const typeId =
      edge.typeId != null
        ? String(edge.typeId)
        : edge.relationshipType && typeof edge.relationshipType === 'object'
        ? edge.relationshipType?.id != null
          ? String(edge.relationshipType.id)
          : null
        : null

    const typeKey = typeName || typeId || label

    const key = `${parentId}-${typeKey}`
    if (!grouped.has(key)) {
      grouped.set(key, {
        parentId,
        typeName,
        typeId,
        typeKey,
        relationshipLabel: label,
        childMap: new Map(),
      })
    }

    const entry = grouped.get(key)
    if (!entry.childMap.has(childId)) entry.childMap.set(childId, [])
    entry.childMap.get(childId).push(edge)
  })

  grouped.forEach((entry) => {
    const childIds = Array.from(entry.childMap.keys())
    if (childIds.length < threshold) return

    if (normalizedCurrentId && childIds.includes(normalizedCurrentId)) {
      return
    }

    const slug = slugifyTypeName(entry.typeName || entry.typeKey)
    const clusterId = `cluster-${entry.parentId}-${slug}`

    const protectedIds = normalizedCurrentId
      ? childIds.filter((childId) =>
          isEntityOnActivePath(childId, normalizedCurrentId, edges)
        )
      : []
    const protectedIdSet = new Set(protectedIds)
    const clusterMembers = childIds.filter((childId) => !protectedIdSet.has(childId))

    if (clusterMembers.length) {
      const baseLabel =
        entry.typeName || entry.relationshipLabel || DEFAULT_RELATIONSHIP_LABEL

      clusters.push({
        id: clusterId,
        parentId: entry.parentId,
        relationshipType: baseLabel,
        typeName: entry.typeName,
        typeId: entry.typeId,
        containedIds: clusterMembers,
        label: `${baseLabel} (${clusterMembers.length})`,
        count: clusterMembers.length,
      })

      clusterMembers.forEach((childId) => {
        const entity = nodeLookup.get(childId) || null
        suppressedNodes.set(childId, {
          clusterId,
          parentId: entry.parentId,
          relationshipType: baseLabel,
          typeName: entry.typeName,
          typeId: entry.typeId,
          entity,
        })

        if (entity) {
          entity.inCluster = true
        }

        const relatedEdges = entry.childMap.get(childId) || []
        relatedEdges.forEach((edge) => edgesToRemove.add(edge.id))
      })

      clusterEdges.push({
        id: `edge-${entry.parentId}-${clusterId}`,
        source: entry.parentId,
        target: clusterId,
        label: baseLabel,
        parentId: entry.parentId,
        childId: clusterId,
        relationshipLabel: baseLabel,
        relationshipType: baseLabel,
        typeName: entry.typeName,
        typeId: entry.typeId,
        isClusterEdge: true,
      })
    }

    protectedIds.forEach((childId) => {
      const entity = nodeLookup.get(childId) || null
      if (entity) {
        entity.isExpandedProtected = true
        if (entity.inCluster) {
          entity.inCluster = false
        }
      }
    })
  })

  if (!clusters.length) {
    return { clusters, suppressedNodes, edges }
  }

  const filteredEdges = edges.filter((edge) => {
    if (!edge) return false
    if (edgesToRemove.has(edge.id)) return false
    const targetId = String(edge.target ?? edge.childId ?? '')
    if (targetId && suppressedNodes.has(targetId)) return false

    const sourceId = String(edge.source ?? edge.parentId ?? '')
    if (sourceId && suppressedNodes.has(sourceId)) return false
    return true
  })

  const updatedEdges = [...filteredEdges, ...clusterEdges]

  return { clusters, suppressedNodes, edges: updatedEdges }
}

function createEntityNodeDefinition(rawNode, { isCenter = false } = {}) {
  const id = String(rawNode.id)
  const label = rawNode?.name || `Entity ${id}`
  const typeName = rawNode?.typeName || 'Entity'
  const isExpandedProtected = Boolean(rawNode?.isExpandedProtected)

  return {
    id,
    type: 'entity',
    width: DEFAULT_ENTITY_WIDTH,
    height: DEFAULT_ENTITY_HEIGHT,
    isExpandedProtected,
    position: { x: 0, y: 0 },
    data: {
      label,
      typeName,
      entityId: id,
      isCenter,
      isExpandedProtected,
    },
  }
}

function createClusterNodeDefinition(cluster, nodeSummaries) {
  const relationshipType = cluster.relationshipType || DEFAULT_RELATIONSHIP_LABEL
  const label = cluster.label || relationshipType
  const count = cluster.count ?? (Array.isArray(cluster.containedIds) ? cluster.containedIds.length : 0)
  return {
    id: cluster.id,
    type: 'cluster',
    width: DEFAULT_CLUSTER_WIDTH,
    height: DEFAULT_CLUSTER_HEIGHT,
    position: { x: 0, y: 0 },
    data: {
      label,
      relationshipType,
      containedIds: cluster.containedIds,
      count,
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

  const activeNodes = normalizedNodes.filter((node) => !node.inCluster)
  const nodesForLayout = activeNodes.length ? activeNodes : normalizedNodes

  const centerKey =
    centerId != null ? String(centerId) : nodesForLayout[0]?.id ?? null
  if (!centerKey) return nodes

  const layoutNodeIds = new Set(nodesForLayout.map((node) => node.id))

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
        .filter(
          (edge) => layoutNodeIds.has(edge.source) && layoutNodeIds.has(edge.target)
        )
    : []

  const levels = buildLevelsFromEdges(centerKey, normalizedEdges)
  ensureAllLevels(levels, nodesForLayout, centerKey)

  const { groups } = buildLevelGroups(levels, nodesForLayout)
  const positions = assignPositions(groups)

  return normalizedNodes.map((node) => {
    const fallbackPlacement = {
      x: node?.position?.x ?? 0,
      y: node?.position?.y ?? 0,
      level: node?.data?.level ?? 0,
      levelIndex: node?.data?.levelIndex ?? 0,
    }
    const placement = positions.get(node.id) || fallbackPlacement
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
    isExpandedProtected: Boolean(node.isExpandedProtected),
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
      suppressedNodes: new Map(),
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
    .map((edge) => normalizeEdge(edge, centerId))
    .filter(Boolean)

  const normalizedNodeList = Array.from(nodeMap.values())

  const {
    clusters: clusterDefinitions,
    suppressedNodes: suppressedNodeMapRaw,
    edges: clusterAwareEdgesRaw,
  } = groupChildrenByRelationship(
    normalizedNodeList,
    normalizedEdges,
    clusterThreshold,
    centerId
  )

  const nodeSummaries = summarizeNodes(nodeMap)

  const suppressedNodeMap =
    suppressedNodeMapRaw instanceof Map
      ? suppressedNodeMapRaw
      : new Map(
          Object.entries(suppressedNodeMapRaw || {}).map(([key, value]) => [
            String(key),
            value,
          ])
        )

  const normalizedSuppressed = new Map()
  suppressedNodeMap.forEach((info, key) => {
    const id = String(key)
    const clusterId = info?.clusterId != null ? String(info.clusterId) : null
    const parentId = info?.parentId != null ? String(info.parentId) : null
    const relationshipType = info?.relationshipType || DEFAULT_RELATIONSHIP_LABEL
    const entity = info?.entity || nodeMap.get(id) || null

    normalizedSuppressed.set(id, {
      clusterId,
      parentId,
      relationshipType,
      entity: entity
        ? {
            ...entity,
            id,
            name: entity?.name || `Entity ${id}`,
            typeName: entity?.typeName || entity?.type?.name || 'Entity',
            isExpandedProtected: Boolean(entity?.isExpandedProtected),
          }
        : null,
    })
  })

  const suppressedNodeIds = new Set(Array.from(normalizedSuppressed.keys()))

  const nodesInClusters = new Set(
    normalizedNodeList.filter((node) => node.inCluster).map((node) => node.id)
  )

  const clusterNodes = clusterDefinitions.map((cluster) =>
    createClusterNodeDefinition(cluster, nodeSummaries)
  )

  const visibleEntityNodes = normalizedNodeList
    .filter((rawNode) => !suppressedNodeIds.has(rawNode.id))
    .map((rawNode) => createEntityNodeDefinition(rawNode, { isCenter: rawNode.id === centerId }))

  const clusterAwareEdges = Array.isArray(clusterAwareEdgesRaw) && clusterAwareEdgesRaw.length
    ? clusterAwareEdgesRaw
    : normalizedEdges

  const filteredClusterAwareEdges = clusterAwareEdges.filter((edge) => {
    if (!edge) return false
    if (edge.isClusterEdge) return true

    const rawSource =
      edge.source != null ? edge.source : edge.parentId != null ? edge.parentId : null
    const rawTarget =
      edge.target != null ? edge.target : edge.childId != null ? edge.childId : null

    const sourceId = rawSource != null ? String(rawSource) : ''
    const targetId = rawTarget != null ? String(rawTarget) : ''

    if ((sourceId && nodesInClusters.has(sourceId)) || (targetId && nodesInClusters.has(targetId))) {
      return false
    }

    return true
  })

  const connectedNodeIds = new Set()
  filteredClusterAwareEdges.forEach((edge) => {
    const sourceId =
      edge.source != null
        ? String(edge.source)
        : edge.parentId != null
        ? String(edge.parentId)
        : null
    const targetId =
      edge.target != null
        ? String(edge.target)
        : edge.childId != null
        ? String(edge.childId)
        : null
    if (sourceId) connectedNodeIds.add(sourceId)
    if (targetId) connectedNodeIds.add(targetId)
  })

  if (centerId) {
    connectedNodeIds.add(centerId)
  }

  const visibleFilteredEntityNodes = visibleEntityNodes.filter((node) =>
    connectedNodeIds.has(String(node.id))
  )

  const visibleEdges = filteredClusterAwareEdges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: 'smoothstep',
    animated: edge.isClusterEdge ? false : true,
    label: edge.label || edge.relationshipLabel || DEFAULT_RELATIONSHIP_LABEL,
    data: {
      relationshipType: edge.relationshipLabel || edge.label || DEFAULT_RELATIONSHIP_LABEL,
      parentId: edge.parentId ?? null,
      childId: edge.childId ?? null,
      isClusterEdge: !!edge.isClusterEdge,
    },
    parentId: edge.parentId ?? null,
    childId: edge.childId ?? null,
    sourceHandle: 'bottom',
    targetHandle: 'top',
  }))

  const layoutNodesInput = [...visibleFilteredEntityNodes, ...clusterNodes]
  const layoutedNodes = layoutNodesHierarchically(layoutNodesInput, visibleEdges, centerId)

  return {
    nodes: layoutedNodes,
    edges: visibleEdges,
    suppressedNodes: normalizedSuppressed,
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
