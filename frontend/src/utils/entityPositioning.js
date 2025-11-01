
export const DEFAULT_CLUSTER_WIDTH = 220
export const DEFAULT_CLUSTER_HEIGHT = 160
export const DEFAULT_ENTITY_WIDTH = 220
export const DEFAULT_ENTITY_HEIGHT = 120
export const CLUSTER_ENTITY_GAP = 40
export const DEFAULT_CLUSTER_THRESHOLD = 5

const DEFAULT_RELATIONSHIP_LABEL = 'Related'

const HIERARCHY_HORIZONTAL_PADDING = 40
const HIERARCHY_VERTICAL_PADDING = 120
const LEVEL_HORIZONTAL_SPACING =
  Math.max(DEFAULT_ENTITY_WIDTH, DEFAULT_CLUSTER_WIDTH) + HIERARCHY_HORIZONTAL_PADDING
const LEVEL_VERTICAL_SPACING =
  DEFAULT_ENTITY_HEIGHT + HIERARCHY_VERTICAL_PADDING
const CLUSTER_ENTITY_HORIZONTAL_SPACING = DEFAULT_ENTITY_WIDTH + CLUSTER_ENTITY_GAP

const PARENT_RELATION_PATTERN =
  /(part of|owned by|managed by|works for|reports to|child of|belongs to|member of|subsidiary of|division of|child)/i
const CHILD_RELATION_PATTERN =
  /(owns|manages|contains|has member|employs|parent of|parent|oversees|supervises|leads)/i
const LAYOUT_PARENT_TO_CHILD_PATTERN =
  /(owns|contains|parent|manages|supervises|leads|employs|has member|has child)/i
const LAYOUT_CHILD_TO_PARENT_PATTERN =
  /(child of|belongs to|part of|owned by|managed by|reports to|works for)/i

const LINKED_TO_SOURCE_PATTERN = /\s*\(linked to source\)/gi

export function sanitizeEntityLabel(name, fallback) {
  if (typeof name === 'string') {
    const cleaned = name.replace(LINKED_TO_SOURCE_PATTERN, '').trim()
    if (cleaned) return cleaned
  }
  return fallback
}

// Determines if a given entity lies along the visible relationship chain
function isEntityOnActivePath(entityId, sourceEntityId, meta) {
  if (!entityId || !sourceEntityId || !(meta instanceof Map)) return false

  let current = String(sourceEntityId)
  const target = String(entityId)
  const visited = new Set()

  while (current && !visited.has(current)) {
    visited.add(current)
    if (current === target) return true
    const parentRaw = meta.get(current)?.parentId
    current = parentRaw != null ? String(parentRaw) : null
  }

  return false
}

function normalizeNode(rawNode) {
  if (!rawNode) return null
  const id = String(rawNode.id ?? '')
  if (!id) return null

  const name = sanitizeEntityLabel(rawNode?.name, `Entity ${id}`)
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

  const relationshipTypeDetails =
    relationshipType && typeof relationshipType === 'object' ? relationshipType : null

  const selectFirstValue = (...values) => {
    for (const value of values) {
      if (value != null && value !== '') return value
    }
    return null
  }

  const fromLabelRaw = selectFirstValue(
    relationshipTypeDetails?.from_label,
    relationshipTypeDetails?.fromLabel,
    relationshipTypeDetails?.from_name,
    relationshipTypeDetails?.fromName,
  )
  const toLabelRaw = selectFirstValue(
    relationshipTypeDetails?.to_label,
    relationshipTypeDetails?.toLabel,
    relationshipTypeDetails?.to_name,
    relationshipTypeDetails?.toName,
  )

  const labelIndicatesParent = (value) =>
    typeof value === 'string' && PARENT_RELATION_PATTERN.test(value)
  const labelIndicatesChild = (value) =>
    typeof value === 'string' && CHILD_RELATION_PATTERN.test(value)

  const fromIndicatesParent = labelIndicatesParent(fromLabelRaw)
  const toIndicatesParent = labelIndicatesParent(toLabelRaw)
  const fromIndicatesChild = labelIndicatesChild(fromLabelRaw)
  const toIndicatesChild = labelIndicatesChild(toLabelRaw)

  if (toIndicatesParent && !fromIndicatesParent) {
    parentId = toEntityId
    childId = fromEntityId
  } else if (fromIndicatesParent && !toIndicatesParent) {
    parentId = fromEntityId
    childId = toEntityId
  } else if (fromIndicatesChild && !toIndicatesChild) {
    parentId = toEntityId
    childId = fromEntityId
  } else if (toIndicatesChild && !fromIndicatesChild) {
    parentId = fromEntityId
    childId = toEntityId
  }

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

  if (fromEntityId && toEntityId && relationshipLabel) {
    const isParentRelationLabel = /(parent|owns|contains)/.test(relationshipLabel)
    const isChildRelationLabel = /(child|belongs to|part of)/.test(relationshipLabel)

    if (isChildRelationLabel && !isParentRelationLabel) {
      const temp = parentId
      parentId = childId
      childId = temp
    }
  }

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

  const normalizedRelationshipType =
    relationshipType && typeof relationshipType === 'object'
      ? {
          id: relationshipType?.id ?? null,
          name:
            relationshipType?.name ||
            relationshipType?.label ||
            relationshipType?.from_label ||
            relationshipType?.to_label ||
            null,
          label: relationshipType?.label ?? null,
          from_label: relationshipType?.from_label ?? null,
          to_label: relationshipType?.to_label ?? null,
        }
      : relationshipType

  const directionalLabel = (() => {
    if (!normalizedRelationshipType) {
      return (
        rawEdge?.label ||
        rawEdge?.typeName ||
        rawEdge?.data?.typeName ||
        DEFAULT_RELATIONSHIP_LABEL
      )
    }

    if (typeof normalizedRelationshipType === 'string') {
      return normalizedRelationshipType || DEFAULT_RELATIONSHIP_LABEL
    }

    const { from_label, to_label, label: baseLabel, name: baseName } =
      normalizedRelationshipType

    if (currentEntityId != null && String(currentEntityId) === fromEntityId) {
      return from_label || baseLabel || baseName || DEFAULT_RELATIONSHIP_LABEL
    }

    if (currentEntityId != null && String(currentEntityId) === toEntityId) {
      return to_label || baseLabel || baseName || DEFAULT_RELATIONSHIP_LABEL
    }

    return baseLabel || baseName || from_label || to_label || DEFAULT_RELATIONSHIP_LABEL
  })()

  const normalizedLabel =
    String(directionalLabel || DEFAULT_RELATIONSHIP_LABEL).trim() ||
    DEFAULT_RELATIONSHIP_LABEL

  const normalizedTypeName = (() => {
    if (!normalizedRelationshipType || typeof normalizedRelationshipType === 'string') {
      return (
        (typeof normalizedRelationshipType === 'string'
          ? normalizedRelationshipType
          : null) || DEFAULT_RELATIONSHIP_LABEL
      )
    }

    return (
      normalizedRelationshipType?.name ||
      normalizedRelationshipType?.label ||
      normalizedRelationshipType?.from_label ||
      normalizedRelationshipType?.to_label ||
      DEFAULT_RELATIONSHIP_LABEL
    )
  })()

  const normalizedTypeId =
    normalizedRelationshipType && typeof normalizedRelationshipType === 'object'
      ? normalizedRelationshipType?.id ?? null
      : null

  return {
    id,
    source: parentId ?? fromEntityId,
    target: childId ?? toEntityId,
    parentId,
    childId,
    label: normalizedLabel,
    typeName: normalizedTypeName ?? DEFAULT_RELATIONSHIP_LABEL,
    typeId: normalizedTypeId ?? null,
    fromEntityId,
    toEntityId,
    relationshipType: normalizedRelationshipType ?? null,
    relationshipLabel: normalizedLabel,
    raw: rawEdge,
  }
}

function groupChildrenByRelationship(
  nodes,
  edges,
  threshold = DEFAULT_CLUSTER_THRESHOLD,
  currentEntityId = null,
  maxClusterDepth = 1
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

  const nodeLevels = new Map()
  if (normalizedCurrentId) {
    nodeLevels.set(normalizedCurrentId, 0)
  }
  nodeLookup.forEach((node, key) => {
    const levelFromData =
      typeof node?.data?.level === 'number'
        ? node.data.level
        : typeof node?.level === 'number'
        ? node.level
        : null
    if (levelFromData != null && Number.isFinite(levelFromData)) {
      nodeLevels.set(key, levelFromData)
    }
  })

  const adjacency = new Map()
  const reverseAdjacency = new Map()

  edges.forEach((edge) => {
    if (!edge) return
    const parentIdRaw = edge.parentId || edge.source || null
    const childIdRaw = edge.childId || edge.target || null
    if (!parentIdRaw || !childIdRaw) return

    const parentId = String(parentIdRaw)
    const childId = String(childIdRaw)

    // Skip clustering for entities whose parent is already suppressed or in a cluster
    const parentNode = nodeLookup.get(parentId) || nodes.find((n) => String(n?.id ?? '') === parentId)
    if (!parentNode || parentNode.inCluster) return

    const childNode = nodeLookup.get(childId) || nodes.find((n) => String(n?.id ?? '') === childId)
    if (childNode?.inCluster) return

    if (!adjacency.has(parentId)) adjacency.set(parentId, new Set())
    adjacency.get(parentId).add(childId)

    if (!reverseAdjacency.has(childId)) reverseAdjacency.set(childId, new Set())
    reverseAdjacency.get(childId).add(parentId)
  })

  const meta = new Map()
  if (normalizedCurrentId) {
    meta.set(normalizedCurrentId, { parentId: null })
    const visitedForMeta = new Set()
    const stack = [normalizedCurrentId]

    while (stack.length) {
      const currentId = stack.pop()
      if (!currentId || visitedForMeta.has(currentId)) continue
      visitedForMeta.add(currentId)

      if (!meta.has(currentId)) {
        meta.set(currentId, { parentId: null })
      }

      const parentSet = reverseAdjacency.get(currentId)
      if (parentSet && parentSet.size) {
        const [primaryParentRaw] = Array.from(parentSet)
        const primaryParent =
          primaryParentRaw != null ? String(primaryParentRaw) : null

        if (primaryParent) {
          const currentMeta = meta.get(currentId) || {}
          if (!currentMeta.parentId) {
            meta.set(currentId, { ...currentMeta, parentId: primaryParent })
          } else {
            meta.set(currentId, { ...currentMeta })
          }

          parentSet.forEach((parentIdRaw) => {
            const normalizedParent =
              parentIdRaw != null ? String(parentIdRaw) : null
            if (!normalizedParent) return
            if (!meta.has(normalizedParent)) {
              meta.set(normalizedParent, { parentId: null })
            }
            if (!visitedForMeta.has(normalizedParent)) {
              stack.push(normalizedParent)
            }
          })
        }
      }
    }
  }

  const levelSeeds = new Set(nodeLevels.keys())
  if (normalizedCurrentId) {
    levelSeeds.add(normalizedCurrentId)
    const parentsOfCenter = reverseAdjacency.get(normalizedCurrentId)
    if (parentsOfCenter) {
      parentsOfCenter.forEach((parentId) => {
        if (!nodeLevels.has(parentId)) {
          nodeLevels.set(parentId, 0)
        }
        levelSeeds.add(parentId)
      })
    }
  }

  const queue = Array.from(levelSeeds)
  while (queue.length) {
    const currentId = queue.shift()
    if (!currentId) continue
    const currentLevel = nodeLevels.get(currentId)
    if (currentLevel == null || !Number.isFinite(currentLevel)) continue

    const children = adjacency.get(currentId)
    if (!children) continue

    children.forEach((childId) => {
      const candidateLevel = currentLevel + 1
      const existingLevel = nodeLevels.get(childId)
      if (existingLevel == null || candidateLevel < existingLevel) {
        nodeLevels.set(childId, candidateLevel)
        queue.push(childId)
      }
    })
  }

  const grouped = new Map()
  edges.forEach((edge) => {
    if (!edge) return
    const parentIdRaw = edge.parentId || edge.source || null
    const childIdRaw = edge.childId || edge.target || null
    if (!parentIdRaw || !childIdRaw) return

    const parentId = String(parentIdRaw)
    const childId = String(childIdRaw)
    if (!parentId || !childId || parentId === childId) return

    const parentNode = nodeLookup.get(parentId)
    const childNode = nodeLookup.get(childId)
    if (parentNode?.inCluster || childNode?.inCluster) return

    const parentLevel = nodeLevels.get(parentId) ?? 0
    const childLevel = nodeLevels.get(childId) ?? parentLevel + 1

    if (parentLevel >= maxClusterDepth || childLevel > maxClusterDepth) return

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

    const typeKey = typeName || typeId || 'unknown-type'

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
    const parentNode = nodeLookup.get(entry.parentId)
    if (parentNode?.inCluster) {
      return
    }

    if (
      nodes.find((n) => String(n?.id ?? '') === entry.parentId)?.inCluster
    ) {
      return
    }

    const childIds = Array.from(entry.childMap.keys()).filter((childId) => {
      const childNode = nodeLookup.get(childId)
      return !(childNode?.inCluster)
    })
    if (childIds.length < threshold) return

    const slug = slugifyTypeName(entry.typeName || entry.typeKey)
    const clusterId = `cluster-${entry.parentId}-${slug}`

    const clusterParentLevel = nodeLevels.get(entry.parentId) ?? 0
    const baseLabel =
      entry.typeName || entry.relationshipLabel || DEFAULT_RELATIONSHIP_LABEL

    const clusterMembers = childIds.filter((childId) => {
      const childNode = nodeLookup.get(childId)
      return !(childNode?.inCluster)
    })

    if (!clusterMembers.length) {
      return
    }

    const clusterDefinition = {
      id: clusterId,
      parentId: entry.parentId,
      relationshipType: baseLabel,
      typeName: entry.typeName,
      typeId: entry.typeId,
      containedIds: [...clusterMembers],
      label: '',
      count: 0,
      parentLevel: clusterParentLevel,
    }

    const protectedIds =
      normalizedCurrentId && clusterDefinition.containedIds.length
        ? clusterDefinition.containedIds.filter((childId) =>
            isEntityOnActivePath(childId, normalizedCurrentId, meta)
          )
        : []
    const protectedIdSet = new Set(protectedIds)

    if (protectedIds.length) {
      clusterDefinition.containedIds = clusterDefinition.containedIds.filter(
        (childId) => !protectedIdSet.has(childId)
      )

      protectedIds.forEach((childId) => {
        const entity = nodeLookup.get(childId) || null
        if (entity) {
          entity.isExpandedProtected = true
          if (entity.inCluster) {
            entity.inCluster = false
          }
        }

        const node = nodes.find((n) => String(n?.id ?? '') === childId)
        if (node && node !== entity) {
          node.isExpandedProtected = true
          if (node.inCluster) {
            node.inCluster = false
          }
        }
      })
    }

    if (!clusterDefinition.containedIds.length) {
      return
    }

    clusterDefinition.containedIds.forEach((cid) => {
      const node = nodes.find((n) => String(n?.id ?? '') === cid) || nodeLookup.get(cid)
      if (node) node.inCluster = true
    })

    clusterDefinition.count = clusterDefinition.containedIds.length
    clusterDefinition.label = `${baseLabel} (${clusterDefinition.count})`

    clusters.push(clusterDefinition)

    clusterMembers.forEach((childId) => {
      if (protectedIdSet.has(childId)) return
      const entity =
        nodeLookup.get(childId) ||
        nodes.find((n) => String(n?.id ?? '') === childId) ||
        null
      if (entity?.isExpandedProtected) {
        entity.inCluster = false
        return
      }
      suppressedNodes.set(childId, {
        clusterId: clusterDefinition.id,
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
      id: `edge-${entry.parentId}-${clusterDefinition.id}`,
      source: entry.parentId,
      target: clusterDefinition.id,
      label: clusterDefinition.label,
      parentId: entry.parentId,
      childId: clusterDefinition.id,
      relationshipLabel: baseLabel,
      relationshipType: baseLabel,
      typeName: entry.typeName,
      typeId: entry.typeId,
      isClusterEdge: true,
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
  const label = sanitizeEntityLabel(rawNode?.name, `Entity ${id}`)
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
  const parentLevel =
    typeof cluster.parentLevel === 'number' && Number.isFinite(cluster.parentLevel)
      ? cluster.parentLevel
      : null
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
      parentLevel,
    },
  }
}

function ensureAllLevels(levels, nodes, centerId) {
  const normalizedCenter = centerId != null ? String(centerId) : null

  nodes.forEach((node) => {
    if (!node) return
    const id = String(node.id)
    if (!levels.has(id)) {
      levels.set(id, id === normalizedCenter ? 0 : 1)
    }
  })

  if (normalizedCenter) {
    levels.set(normalizedCenter, 0)
  }

  levels.forEach((value, key) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      levels.set(key, key === normalizedCenter ? 0 : 1)
    }
  })
}

function buildLevelGroups(levels, nodes) {
  let minLevel = Infinity

  nodes.forEach((node) => {
    if (!node) return
    const value = levels.get(node.id)
    if (typeof value === 'number' && Number.isFinite(value)) {
      if (value < minLevel) minLevel = value
    }
  })

  if (!Number.isFinite(minLevel)) {
    minLevel = 0
  }

  const grouped = new Map()
  const visualLevels = new Map()

  nodes.forEach((node) => {
    if (!node) return
    const rawLevel = levels.get(node.id) ?? 0
    const visualLevel = rawLevel - minLevel
    visualLevels.set(node.id, visualLevel)
    if (!grouped.has(visualLevel)) grouped.set(visualLevel, [])
    grouped.get(visualLevel).push(node)
  })

  const sortedLevels = Array.from(grouped.keys()).sort((a, b) => a - b)
  const groups = new Map()

  sortedLevels.forEach((level) => {
    const entries = grouped.get(level) || []
    entries.sort((a, b) => {
      const aLabel = a?.data?.label || a.id
      const bLabel = b?.data?.label || b.id
      return aLabel.localeCompare(bLabel)
    })
    groups.set(level, entries)
  })

  return { groups, visualLevels }
}

function getNodeLabelValue(node) {
  if (!node) return ''
  const label = typeof node?.data?.label === 'string' ? node.data.label.trim() : ''
  if (label) return label
  const name = typeof node?.name === 'string' ? node.name.trim() : ''
  if (name) return name
  const id = node?.id != null ? String(node.id) : ''
  return id
}

function compareNodesByLabel(a, b) {
  const aLabel = getNodeLabelValue(a)
  const bLabel = getNodeLabelValue(b)
  return aLabel.localeCompare(bLabel)
}

function buildPrimaryParentMap(edges, levels, nodeLookup) {
  const parentsByChild = new Map()

  edges.forEach((edge) => {
    if (!edge) return
    const parentRaw =
      edge?.parentId ?? edge?.data?.parentId ?? edge?.source ?? edge?.data?.source ?? null
    const childRaw =
      edge?.childId ?? edge?.data?.childId ?? edge?.target ?? edge?.data?.target ?? null

    const parentId = parentRaw != null ? String(parentRaw) : null
    const childId = childRaw != null ? String(childRaw) : null

    if (!parentId || !childId || parentId === childId) return

    if (!parentsByChild.has(childId)) parentsByChild.set(childId, new Set())
    parentsByChild.get(childId).add(parentId)
  })

  const result = new Map()

  parentsByChild.forEach((parents, childId) => {
    let selectedParent = null
    let selectedLevel = Infinity
    let selectedLabel = ''

    parents.forEach((parentId) => {
      const levelValue = levels.get(parentId)
      if (typeof levelValue !== 'number' || !Number.isFinite(levelValue)) return

      const parentNode = nodeLookup.get(parentId)
      const labelValue = getNodeLabelValue(parentNode)

      if (selectedParent == null || levelValue < selectedLevel) {
        selectedParent = parentId
        selectedLevel = levelValue
        selectedLabel = labelValue
        return
      }

      if (levelValue === selectedLevel) {
        if (labelValue.localeCompare(selectedLabel) < 0) {
          selectedParent = parentId
          selectedLabel = labelValue
        }
      }
    })

    if (selectedParent != null) {
      result.set(childId, selectedParent)
    }
  })

  return result
}

function assignPositions(groups, primaryParentByNode = new Map()) {
  const positions = new Map()
  let globalMinX = Infinity

  const baseY = 0
  const sortedLevels = Array.from(groups.keys()).sort((a, b) => a - b)

  sortedLevels.forEach((level) => {
    const nodesAtLevel = groups.get(level) || []
    if (!nodesAtLevel.length) return

    const groupedByParent = new Map()
    const orphans = []

    nodesAtLevel.forEach((node) => {
      const parentId = primaryParentByNode.get(node.id)
      const parentPosition = parentId ? positions.get(parentId) : null
      if (parentId && parentPosition) {
        if (!groupedByParent.has(parentId)) groupedByParent.set(parentId, [])
        groupedByParent.get(parentId).push(node)
        return
      }

      orphans.push(node)
    })

    const levelGroups = []

    groupedByParent.forEach((children, parentId) => {
      const parentPosition = positions.get(parentId)
      if (!parentPosition) {
        children.forEach((child) => orphans.push(child))
        return
      }
      const sortedChildren = [...children].sort(compareNodesByLabel)
      levelGroups.push({
        anchorX: parentPosition.x,
        nodes: sortedChildren,
        parentId,
      })
    })

    if (orphans.length) {
      const sortedOrphans = [...orphans].sort(compareNodesByLabel)
      levelGroups.push({
        anchorX: null,
        nodes: sortedOrphans,
        parentId: null,
      })
    }

    levelGroups.sort((a, b) => {
      if (a.anchorX != null && b.anchorX != null) return a.anchorX - b.anchorX
      if (a.anchorX != null) return -1
      if (b.anchorX != null) return 1
      return 0
    })

    let hasPlaced = false
    let rightmostAssigned = -Infinity
    let levelIndexCounter = 0

    levelGroups.forEach((group) => {
      const width = (group.nodes.length - 1) * LEVEL_HORIZONTAL_SPACING
      let startX

      if (group.anchorX != null) {
        startX = group.anchorX - width / 2
      } else {
        startX =
          hasPlaced && Number.isFinite(rightmostAssigned)
            ? rightmostAssigned + LEVEL_HORIZONTAL_SPACING
            : -width / 2
      }

      const y = baseY + level * LEVEL_VERTICAL_SPACING

      group.nodes.forEach((node, index) => {
        const x = startX + index * LEVEL_HORIZONTAL_SPACING
        positions.set(node.id, { x, y, level, levelIndex: levelIndexCounter })
        levelIndexCounter += 1
        if (x < globalMinX) globalMinX = x
      })

      const groupRight = startX + width
      rightmostAssigned = Math.max(rightmostAssigned, groupRight)
      hasPlaced = true
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

function extractEdgeRelationshipLabel(edge) {
  if (!edge) return ''

  const rawRelationship =
    edge?.data?.relationshipType ??
    edge?.relationshipType ??
    edge?.label ??
    edge?.relationshipLabel ??
    ''

  if (typeof rawRelationship === 'string') {
    return rawRelationship.toLowerCase()
  }

  if (rawRelationship && typeof rawRelationship === 'object') {
    const candidate =
      rawRelationship?.label ??
      rawRelationship?.name ??
      rawRelationship?.from_label ??
      rawRelationship?.to_label ??
      ''

    if (typeof candidate === 'string') {
      return candidate.toLowerCase()
    }
  }

  return ''
}

function buildLevelsFromEdges(centerKey, edges) {
  const levels = new Map()
  if (!centerKey) return levels

  const normalizedCenter = String(centerKey)
  levels.set(normalizedCenter, 0)

  const parentToChildren = new Map()
  const childToParents = new Map()

  edges.forEach((edge) => {
    if (!edge) return
    const parentRaw =
      edge?.parentId ?? edge?.data?.parentId ?? edge?.source ?? null
    const childRaw = edge?.childId ?? edge?.data?.childId ?? edge?.target ?? null

    const parentId = parentRaw != null ? String(parentRaw) : null
    const childId = childRaw != null ? String(childRaw) : null

    if (!parentId || !childId || parentId === childId) return

    if (!parentToChildren.has(parentId)) parentToChildren.set(parentId, new Set())
    parentToChildren.get(parentId).add(childId)

    if (!childToParents.has(childId)) childToParents.set(childId, new Set())
    childToParents.get(childId).add(parentId)
  })

  const queue = [normalizedCenter]

  while (queue.length) {
    const current = queue.shift()
    if (!current) continue

    const currentLevel = levels.get(current) ?? 0

    const parents = childToParents.get(current)
    if (parents) {
      parents.forEach((parentId) => {
        const normalizedParent = parentId != null ? String(parentId) : null
        if (!normalizedParent) return
        const candidateLevel = currentLevel - 1
        const existing = levels.get(normalizedParent)
        if (existing == null || candidateLevel < existing) {
          levels.set(normalizedParent, candidateLevel)
          queue.push(normalizedParent)
        }
      })
    }

    const children = parentToChildren.get(current)
    if (children) {
      children.forEach((childId) => {
        const normalizedChild = childId != null ? String(childId) : null
        if (!normalizedChild) return
        const candidateLevel = currentLevel + 1
        const existing = levels.get(normalizedChild)
        if (existing == null || candidateLevel < existing) {
          levels.set(normalizedChild, candidateLevel)
          queue.push(normalizedChild)
        }
      })
    }
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
          const source = edge?.source != null ? String(edge.source) : ''
          const target = edge?.target != null ? String(edge.target) : ''
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

  const directionalEdges = normalizedEdges
    .map((edge) => {
      if (!edge) return null
      const directionalEdge = {
        ...edge,
        data: { ...(edge.data || {}) },
      }

      const source = directionalEdge.source || ''
      const target = directionalEdge.target || ''
      if (!source || !target || source === target) {
        return null
      }

      let parentId =
        directionalEdge.parentId != null ? String(directionalEdge.parentId) : null
      let childId =
        directionalEdge.childId != null ? String(directionalEdge.childId) : null

      if (!parentId || !childId) {
        let nextSource = source
        let nextTarget = target
        const relationshipLabel = extractEdgeRelationshipLabel(directionalEdge)
        const indicatesParentToChild =
          relationshipLabel &&
          LAYOUT_PARENT_TO_CHILD_PATTERN.test(relationshipLabel)
        const indicatesChildToParent =
          relationshipLabel &&
          LAYOUT_CHILD_TO_PARENT_PATTERN.test(relationshipLabel)

        if (indicatesChildToParent && !indicatesParentToChild) {
          const temp = nextSource
          nextSource = nextTarget
          nextTarget = temp
        }

        parentId = parentId ?? nextSource
        childId = childId ?? nextTarget
      }

      if (!parentId || !childId || parentId === childId) {
        parentId = source
        childId = target
      }

      directionalEdge.source = parentId
      directionalEdge.target = childId
      directionalEdge.parentId = parentId
      directionalEdge.childId = childId
      directionalEdge.data = {
        ...directionalEdge.data,
        parentId,
        childId,
      }

      return directionalEdge
    })
    .filter(Boolean)
    .filter(
      (edge) => layoutNodeIds.has(edge.source) && layoutNodeIds.has(edge.target)
    )

  const levels = buildLevelsFromEdges(centerKey, directionalEdges)
  ensureAllLevels(levels, nodesForLayout, centerKey)

  nodesForLayout.forEach((node) => {
    if (!node) return
    const isClusterNode = node.type === 'cluster' || node.type === 'clusterNode'
    if (!isClusterNode) return

    const parentIdRaw =
      node.parentId ??
      node.data?.parentId ??
      node.data?.sourceId ??
      node.data?.source ??
      null

    if (!parentIdRaw) return

    const parentId = String(parentIdRaw)
    const parentLevel = levels.get(parentId) ?? 0
    levels.set(node.id, parentLevel + 1)
  })

  const { groups, visualLevels } = buildLevelGroups(levels, nodesForLayout)
  const nodeLookup = new Map(nodesForLayout.map((node) => [node.id, node]))
  const primaryParentByNode = buildPrimaryParentMap(
    directionalEdges,
    levels,
    nodeLookup
  )
  const positions = assignPositions(groups, primaryParentByNode)

  return normalizedNodes.map((node) => {
    const rawLevel = levels.get(node.id) ?? 0
    const visualLevel = visualLevels.get(node.id) ?? rawLevel
    const fallbackPlacement = {
      x: node?.position?.x ?? 0,
      y: visualLevel * LEVEL_VERTICAL_SPACING,
      level: visualLevel,
      levelIndex: node?.data?.levelIndex ?? 0,
    }
    const placement = positions.get(node.id) || fallbackPlacement
    const isClusterNode = node.type === 'cluster' || node.type === 'clusterNode'
    const adjustedX = isClusterNode ? placement.x + 40 : placement.x
    return {
      ...node,
      position: { x: adjustedX, y: placement.y },
      data: {
        ...node.data,
        level: rawLevel,
        visualLevel: placement.level ?? visualLevel,
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

function buildParentLookup(edges) {
  const lookup = new Map()
  if (!Array.isArray(edges)) return lookup

  edges.forEach((edge) => {
    if (!edge) return
    if (edge.isClusterEdge || edge?.data?.isClusterEdge || edge?.data?.isClusterChildEdge)
      return

    const parentRaw = edge?.parentId ?? edge?.source ?? null
    const childRaw = edge?.childId ?? edge?.target ?? null
    if (parentRaw == null || childRaw == null) return

    const parentId = String(parentRaw)
    const childId = String(childRaw)
    if (!childId) return

    if (!lookup.has(childId)) lookup.set(childId, new Set())
    lookup.get(childId).add(parentId)
  })

  return lookup
}

function createShouldRenderNode({
  centerId = null,
  parentLookup = new Map(),
  suppressedIds = new Set(),
  candidateIds = new Set(),
  alwaysIncludeIds = new Set(),
}) {
  const cache = new Map()
  const normalizedCenter = centerId != null ? String(centerId) : null
  const forcedIds = new Set(
    alwaysIncludeIds instanceof Set
      ? Array.from(alwaysIncludeIds).map(String)
      : Array.isArray(alwaysIncludeIds)
      ? alwaysIncludeIds.map((id) => String(id))
      : []
  )

  function resolver(nodeId, visiting = new Set()) {
    const key = String(nodeId)
    if (!key) return false

    if (cache.has(key)) {
      return cache.get(key)
    }

    if (suppressedIds.has(key)) {
      cache.set(key, false)
      return false
    }

    if (!candidateIds.has(key) && !forcedIds.has(key)) {
      cache.set(key, false)
      return false
    }

    if (normalizedCenter && key === normalizedCenter) {
      cache.set(key, true)
      return true
    }

    if (forcedIds.has(key)) {
      cache.set(key, true)
      return true
    }

    const parents = parentLookup.get(key)
    if (!parents || parents.size === 0) {
      cache.set(key, true)
      return true
    }

    if (visiting.has(key)) {
      cache.set(key, false)
      return false
    }

    visiting.add(key)

    let hasRenderableParent = false

    for (const parentId of parents) {
      const normalizedParent = String(parentId)
      if (!normalizedParent) continue

      if (suppressedIds.has(normalizedParent)) {
        continue
      }

      if (!candidateIds.has(normalizedParent) && !forcedIds.has(normalizedParent)) {
        hasRenderableParent = true
        continue
      }

      if (forcedIds.has(normalizedParent)) {
        hasRenderableParent = true
        continue
      }

      if (resolver(normalizedParent, visiting)) {
        hasRenderableParent = true
      }
    }

    visiting.delete(key)

    if (!hasRenderableParent) {
      cache.set(key, false)
      return false
    }

    cache.set(key, true)
    return true
  }

  return resolver
}

export function buildReactFlowGraph(
  data,
  entityId,
  clusterThreshold = DEFAULT_CLUSTER_THRESHOLD,
  options = {}
) {
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
      clusters: [],
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

  const optionIncludeIds = options?.alwaysIncludeIds
  const forcedIncludeIds = new Set(
    optionIncludeIds instanceof Set
      ? Array.from(optionIncludeIds).map(String)
      : Array.isArray(optionIncludeIds)
      ? optionIncludeIds.map((id) => String(id))
      : optionIncludeIds && typeof optionIncludeIds === 'object'
      ? Object.values(optionIncludeIds).map((id) => String(id))
      : []
  )

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
            name: sanitizeEntityLabel(entity?.name, `Entity ${id}`),
            typeName: entity?.typeName || entity?.type?.name || 'Entity',
            isExpandedProtected: Boolean(entity?.isExpandedProtected),
          }
        : null,
    })
  })

  forcedIncludeIds.forEach((id) => {
    normalizedSuppressed.delete(String(id))
  })

  const suppressedNodeIds = new Set(Array.from(normalizedSuppressed.keys()))

  const clusterNodes = (Array.isArray(clusterDefinitions) ? clusterDefinitions : []).map(
    (cluster) => createClusterNodeDefinition(cluster, nodeSummaries)
  )

  const entityNodes = normalizedNodeList.map((rawNode) =>
    createEntityNodeDefinition(rawNode, { isCenter: rawNode.id === centerId })
  )

  const candidateEntityNodes = entityNodes.filter(
    (node) => !suppressedNodeIds.has(String(node.id))
  )

  const candidateIds = new Set(candidateEntityNodes.map((node) => String(node.id)))
  if (centerId != null) {
    candidateIds.add(String(centerId))
  }

  forcedIncludeIds.forEach((id) => {
    candidateIds.add(String(id))
  })

  const parentLookup = buildParentLookup(normalizedEdges)
  const shouldRenderNode = createShouldRenderNode({
    centerId,
    parentLookup,
    suppressedIds: suppressedNodeIds,
    candidateIds,
    alwaysIncludeIds: forcedIncludeIds,
  })

  const visibleEntityNodes = candidateEntityNodes.filter((node) =>
    shouldRenderNode(String(node.id))
  )

  const visibleEntityIdSet = new Set(
    visibleEntityNodes.map((node) => String(node.id))
  )

  const filteredVisibleEntityNodes = visibleEntityNodes.filter((node) => {
    const nodeId = String(node.id)
    if (!nodeId) return false

    const parents = parentLookup.get(nodeId)
    if (!parents || !parents.size) {
      return true
    }

    for (const parentId of parents) {
      const normalizedParent = parentId != null ? String(parentId) : ''
      if (!normalizedParent) continue
      if (visibleEntityIdSet.has(normalizedParent)) {
        return true
      }
    }

    return false
  })

  const visibleNodes = [...filteredVisibleEntityNodes, ...clusterNodes]

  // Determine all currently visible node IDs
  const visibleNodeIds = new Set(visibleNodes.map((node) => String(node.id)))

  // Filter edges to exclude those whose parent is hidden or clustered
  const visibleEdges = normalizedEdges.filter((edge) => {
    if (!edge) return false

    const parentRaw =
      edge.parentId != null
        ? edge.parentId
        : edge.source != null
        ? edge.source
        : null

    if (parentRaw == null) {
      return true
    }

    const parentId = String(parentRaw)

    if (!visibleNodeIds.has(parentId)) {
      return false
    }

    if (suppressedNodeIds.has(parentId)) {
      return false
    }

    return true
  })

  const clusterAwareEdges =
    Array.isArray(clusterAwareEdgesRaw) && clusterAwareEdgesRaw.length
      ? clusterAwareEdgesRaw
      : visibleEdges

  const filteredEdges = clusterAwareEdges.filter((edge) => {
    if (!edge) return false
    if (edge.isClusterEdge) return true

    const parentRaw =
      edge.parentId != null
        ? edge.parentId
        : edge.source != null
        ? edge.source
        : null

    if (parentRaw != null) {
      const parentId = String(parentRaw)
      if (!visibleNodeIds.has(parentId)) {
        return false
      }

      if (suppressedNodeIds.has(parentId)) {
        return false
      }
    }

    const rawSource =
      edge.source != null ? edge.source : edge.parentId != null ? edge.parentId : null
    const rawTarget =
      edge.target != null ? edge.target : edge.childId != null ? edge.childId : null

    const sourceId = rawSource != null ? String(rawSource) : ''
    const targetId = rawTarget != null ? String(rawTarget) : ''

    if (sourceId && suppressedNodeIds.has(sourceId)) return false
    if (targetId && suppressedNodeIds.has(targetId)) return false

    return true
  })

  const connectedNodeIds = new Set()
  filteredEdges.forEach((edge) => {
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

  const visibleFilteredNodes = visibleNodes.filter((node) =>
    connectedNodeIds.has(String(node.id))
  )

  // Allow the source node unconditionally and build a set of reachable nodes
  // Traverse the filtered edges in both directions so that parents of the
  // center entity remain visible in addition to any of their descendants.
  const allowedNodeIds = new Set(centerId != null ? [String(centerId)] : [])
  let added = true
  while (added) {
    added = false
    for (const edge of filteredEdges) {
      if (!edge) continue

      const parentRaw =
        edge.parentId != null ? edge.parentId : edge.source != null ? edge.source : null
      const childRaw =
        edge.childId != null ? edge.childId : edge.target != null ? edge.target : null

      const parent = parentRaw != null ? String(parentRaw) : ''
      const child = childRaw != null ? String(childRaw) : ''

      const hasParent = Boolean(parent)
      const hasChild = Boolean(child)

      if (hasParent && allowedNodeIds.has(parent)) {
        if (hasChild && !allowedNodeIds.has(child)) {
          allowedNodeIds.add(child)
          added = true
        }
      }

      if (hasChild && allowedNodeIds.has(child)) {
        if (hasParent && !allowedNodeIds.has(parent)) {
          allowedNodeIds.add(parent)
          added = true
        }
      }
    }
  }

  // Filter out any node whose direct parent is not in allowedNodeIds
  const finalVisibleNodes = visibleFilteredNodes.filter((node) =>
    allowedNodeIds.has(String(node.id))
  )

  // Also filter edges: keep only those connecting allowed nodes
  const finalFilteredEdges = filteredEdges.filter((edge) => {
    const parent = edge.parentId != null ? String(edge.parentId) : String(edge.source ?? '')
    const child = edge.childId != null ? String(edge.childId) : String(edge.target ?? '')
    return parent && child && allowedNodeIds.has(parent) && allowedNodeIds.has(child)
  })

  // Map filtered edges to React Flow edge format
  const reactFlowEdges = finalFilteredEdges.map((edge) => ({
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

  const layoutedNodes = layoutNodesHierarchically(
    finalVisibleNodes,
    reactFlowEdges,
    centerId
  )

  const layoutedClusters = layoutedNodes.filter((node) => node.type === 'cluster')

  return {
    nodes: layoutedNodes,
    edges: reactFlowEdges,
    suppressedNodes: normalizedSuppressed,
    clusters: layoutedClusters,
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
      label: sanitizeEntityLabel(entity.name, `Entity ${entityId}`),
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

export function normalizeGraphEdge(rawEdge, currentEntityId) {
  return normalizeEdge(rawEdge, currentEntityId)
}
