// src/utils/locationPositioning.js
// Utility for calculating hierarchical positions for location nodes

export const DEFAULT_LOCATION_WIDTH = 120 // Polished, slightly larger square
export const DEFAULT_LOCATION_HEIGHT = 120 // Square dimensions
// Restored spacing ratios from when 80x80 nodes were working perfectly
// Scaled by 1.5x (120/80) to maintain the same proportions
const HIERARCHY_HORIZONTAL_PADDING = 60 * 1.5 // 90 - maintains ratio from 80x80 nodes
const HIERARCHY_VERTICAL_PADDING = 80 * 1.5 // 120 - maintains ratio from 80x80 nodes
const LEVEL_HORIZONTAL_SPACING = DEFAULT_LOCATION_WIDTH + HIERARCHY_HORIZONTAL_PADDING
const LEVEL_VERTICAL_SPACING = DEFAULT_LOCATION_HEIGHT + HIERARCHY_VERTICAL_PADDING
const MIN_NODE_GAP = DEFAULT_LOCATION_WIDTH + (40 * 1.5) // 180 - maintains ratio from 80x80 nodes
const SIBLING_GROUP_PADDING = 40 * 1.5 // 60 - maintains ratio from 80x80 nodes

/**
 * Builds a map of parent_id -> [child_ids] from location data
 */
function buildParentChildMap(locations) {
  const parentToChildren = new Map()
  
  locations.forEach((location) => {
    if (!location) return
    const locationId = String(location.id)
    // Handle both normalized (parentId) and raw (parent_id) formats
    const parentId = location.parentId || (location.parent_id ? String(location.parent_id) : null)
    
    if (parentId) {
      if (!parentToChildren.has(parentId)) {
        parentToChildren.set(parentId, [])
      }
      parentToChildren.get(parentId).push(locationId)
    }
  })
  
  return parentToChildren
}

/**
 * Builds level assignments for locations based on parent_id relationships
 * Root locations (no parent) are at level 0, children are at parent level + 1
 */
function buildLevelsFromLocations(locations, rootLocationId = null) {
  const levels = new Map()
  const parentToChildren = buildParentChildMap(locations)
  
  // Find root locations (no parent) and sort them intelligently
  // Check both parentId (normalized) and parent_id (raw)
  const rootLocationsData = locations.filter((loc) => {
    const hasParent = loc.parentId || loc.parent_id
    return !hasParent
  })
  
  // Sort root locations: most children first, then by type, then by name
  rootLocationsData.sort((a, b) => {
    const childCountA = a.childCount || 0
    const childCountB = b.childCount || 0
    if (childCountA !== childCountB) {
      return childCountB - childCountA // More children first
    }
    const typeA = (a.locationType?.name || '').toLowerCase()
    const typeB = (b.locationType?.name || '').toLowerCase()
    const typeCompare = typeA.localeCompare(typeB)
    if (typeCompare !== 0) return typeCompare
    return (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase())
  })
  
  const rootLocations = rootLocationsData.map((loc) => String(loc.id))
  
  // If a root location ID is specified, use it as the center
  // Otherwise, use the first root location (which is now sorted intelligently)
  const centerId = rootLocationId ? String(rootLocationId) : (rootLocations[0] || null)
  
  // Set all root locations to level 0
  rootLocations.forEach((id) => {
    levels.set(id, 0)
  })
  
  // Assign levels using BFS from root locations
  const queue = rootLocations.map((id) => ({ id, level: 0 }))
  const visited = new Set(rootLocations)
  
  while (queue.length > 0) {
    const { id, level } = queue.shift()
    const children = parentToChildren.get(id) || []
    
    children.forEach((childId) => {
      if (!visited.has(childId)) {
        visited.add(childId)
        levels.set(childId, level + 1)
        queue.push({ id: childId, level: level + 1 })
      }
    })
  }
  
  // Ensure all locations have a level (orphans get level 0)
  locations.forEach((location) => {
    if (!location) return
    const locationId = String(location.id)
    if (!levels.has(locationId)) {
      // Orphan location - assign to level 0
      levels.set(locationId, 0)
    }
  })
  
  return { levels, centerId }
}

/**
 * Groups nodes by their level
 */
function buildLevelGroups(levels, nodes) {
  const groups = new Map()
  let minLevel = Infinity
  
  nodes.forEach((node) => {
    if (!node) return
    const level = levels.get(node.id) ?? 0
    if (level < minLevel) minLevel = level
    
    if (!groups.has(level)) {
      groups.set(level, [])
    }
    groups.get(level).push(node)
  })
  
  // Normalize levels to start at 0
  const visualLevels = new Map()
  const normalizedGroups = new Map()
  
  groups.forEach((nodesAtLevel, rawLevel) => {
    const visualLevel = rawLevel - minLevel
    normalizedGroups.set(visualLevel, nodesAtLevel)
    nodesAtLevel.forEach((node) => {
      visualLevels.set(node.id, visualLevel)
    })
  })
  
  return { groups: normalizedGroups, visualLevels }
}

/**
 * Compares nodes with intelligent sorting:
 * 1. Locations with children first (to show hierarchy)
 * 2. Then by type name (group similar types)
 * 3. Then by name (alphabetical)
 */
function compareNodes(a, b) {
  if (!a && !b) return 0
  if (!a) return 1
  if (!b) return -1
  
  // Get child counts
  const childCountA = a.data?.childCount || a.childCount || 0
  const childCountB = b.data?.childCount || b.childCount || 0
  
  // Locations with children first
  if (childCountA !== childCountB) {
    return childCountB - childCountA // Descending: more children first
  }
  
  // Then by type name
  const typeA = (a.data?.typeName || a.typeName || '').toLowerCase()
  const typeB = (b.data?.typeName || b.typeName || '').toLowerCase()
  const typeCompare = typeA.localeCompare(typeB)
  if (typeCompare !== 0) {
    return typeCompare
  }
  
  // Finally by name (alphabetical)
  const nameA = (a.data?.label || a.name || '').toLowerCase()
  const nameB = (b.data?.label || b.name || '').toLowerCase()
  return nameA.localeCompare(nameB)
}

/**
 * Checks if a position would overlap with existing positions
 */
function wouldOverlap(x, y, positions, nodeWidth = DEFAULT_LOCATION_WIDTH, nodeHeight = DEFAULT_LOCATION_HEIGHT, margin = 25 * 1.5) {
  for (const [id, pos] of positions.entries()) {
    const dx = Math.abs(x - pos.x)
    const dy = Math.abs(y - pos.y)
    // Check if nodes would overlap (accounting for margins)
    // Restored margin ratio from working 80x80 layout (scaled by 1.5x)
    const requiredX = (nodeWidth / 2) + (pos.width || DEFAULT_LOCATION_WIDTH) / 2 + margin
    const requiredY = (nodeHeight / 2) + (pos.height || DEFAULT_LOCATION_HEIGHT) / 2 + margin
    if (dx < requiredX && dy < requiredY) {
      return true
    }
  }
  return false
}

/**
 * Checks if a position would be directly under a node that is not the parent
 * This ensures nodes only sit under their parent or blank space, never under another node
 */
function wouldBeUnderNonParent(x, y, currentNodeParentId, positions, nodeWidth = DEFAULT_LOCATION_WIDTH, levelSpacing = LEVEL_VERTICAL_SPACING) {
  // Check all positions at the level directly above (one level up)
  const levelAboveY = y - levelSpacing
  
  for (const [nodeId, pos] of positions.entries()) {
    // Only check nodes at the level directly above (within a small tolerance for floating point)
    const yDiff = Math.abs(pos.y - levelAboveY)
    if (yDiff > 5) continue // Not at the level directly above
    
    // Check if this node is directly above our position
    const dx = Math.abs(x - pos.x)
    const threshold = nodeWidth / 2 // Within half a node width = directly above
    
    if (dx < threshold) {
      // There's a node directly above us
      // Check if it's our parent
      const nodeAboveId = String(nodeId)
      const expectedParentId = currentNodeParentId ? String(currentNodeParentId) : null
      
      // If it's not our parent, this position is invalid
      if (nodeAboveId !== expectedParentId) {
        return true
      }
    }
  }
  return false
}

/**
 * Checks if a position would be directly above another node's child
 * This prevents visual confusion where a node appears to be a parent of someone else's child
 */
function wouldBeAboveOthersChild(x, y, currentNodeParentId, positions, parentToChildren, nodeWidth = DEFAULT_LOCATION_WIDTH) {
  // Check all positions at lower levels (higher Y values)
  for (const [nodeId, pos] of positions.entries()) {
    // Only check nodes below the current position
    if (pos.y <= y) continue
    
    // Get the parent of this node by checking the parentToChildren map
    let childParentId = null
    for (const [parentId, children] of parentToChildren.entries()) {
      if (children.includes(String(nodeId))) {
        childParentId = parentId
        break
      }
    }
    
    // If this node is a child of a different parent (or we have no parent), and we're directly above it
    if (childParentId && childParentId !== currentNodeParentId) {
      const dx = Math.abs(x - pos.x)
      // If we're within half a node width, we're directly above it
      const threshold = nodeWidth / 2
      if (dx < threshold) {
        return true
      }
    }
  }
  return false
}

/**
 * Finds the next available X position that doesn't overlap, isn't above another's child, and isn't under a non-parent
 */
function findNonOverlappingX(desiredX, y, positions, nodeWidth = DEFAULT_LOCATION_WIDTH, nodeHeight = DEFAULT_LOCATION_HEIGHT, step = MIN_NODE_GAP, currentNodeParentId = null, parentToChildren = new Map()) {
  let x = desiredX
  let attempts = 0
  const maxAttempts = 200
  
  // Restored margin from working 80x80 layout (scaled by 1.5x)
  while (
    (wouldOverlap(x, y, positions, nodeWidth, nodeHeight, 25 * 1.5) ||
     wouldBeAboveOthersChild(x, y, currentNodeParentId, positions, parentToChildren, nodeWidth) ||
     wouldBeUnderNonParent(x, y, currentNodeParentId, positions, nodeWidth)) &&
    attempts < maxAttempts
  ) {
    x += step
    attempts++
  }
  
  return x
}

/**
 * Assigns positions to locations in a hierarchical layout
 * Children appear below their parents, with proper spacing to avoid overlaps
 */
function assignPositions(groups, visualLevels, parentToChildren = new Map()) {
  const positions = new Map()
  let globalMinX = Infinity
  const baseY = 0
  const sortedLevels = Array.from(groups.keys()).sort((a, b) => a - b)
  let levelIndexCounter = 0
  
  sortedLevels.forEach((visualLevel) => {
    const nodesAtLevel = groups.get(visualLevel) || []
    if (!nodesAtLevel.length) return
    
    // Sort nodes with intelligent ordering
    nodesAtLevel.sort(compareNodes)
    
    // Calculate Y position based on visual level (level 0 = top, higher levels = lower Y)
    const y = baseY + visualLevel * LEVEL_VERTICAL_SPACING
    
    // For visual level 0 (root locations), position them horizontally with spacing
    if (visualLevel === 0) {
      let currentX = 0
      nodesAtLevel.forEach((node) => {
        // Root nodes have no parent, so pass null
        currentX = findNonOverlappingX(currentX, y, positions, DEFAULT_LOCATION_WIDTH, DEFAULT_LOCATION_HEIGHT, MIN_NODE_GAP, null, parentToChildren)
        const x = currentX
        const rawLevel = 0
        positions.set(node.id, {
          x,
          y,
          level: rawLevel,
          visualLevel: visualLevel,
          levelIndex: levelIndexCounter,
        })
        levelIndexCounter += 1
        currentX += LEVEL_HORIZONTAL_SPACING
        if (x < globalMinX) globalMinX = x
      })
      return
    }
    
    // For levels > 0, group nodes by their parent
    const groupsByParent = new Map() // parentId -> nodes[]
    const orphans = []
    
    nodesAtLevel.forEach((node) => {
      // Get parent ID and ensure it's a string
      const parentIdRaw = node.data?.parentId || node.parentId || null
      const parentId = parentIdRaw ? String(parentIdRaw) : null
      const parentPosition = parentId ? positions.get(parentId) : null
      
      if (parentId && parentPosition) {
        if (!groupsByParent.has(parentId)) {
          groupsByParent.set(parentId, [])
        }
        groupsByParent.get(parentId).push(node)
      } else {
        // This shouldn't happen for levels > 0, but handle it
        orphans.push(node)
      }
    })
    
    // Process groups with parents (sorted by parent X position)
    const sortedParentIds = Array.from(groupsByParent.keys()).sort((a, b) => {
      const posA = positions.get(a)?.x ?? 0
      const posB = positions.get(b)?.x ?? 0
      return posA - posB
    })
    
    // Position children grouped by parent to avoid crossing lines
    // First, calculate ideal positions for all groups
    const groupPositions = []
    
    sortedParentIds.forEach((parentId) => {
      const children = groupsByParent.get(parentId) || []
      if (!children.length) return
      
      // Sort children with the same logic
      children.sort(compareNodes)
      
      const parentPosition = positions.get(parentId)
      if (!parentPosition) return
      
      // Calculate spacing for this parent's children
      const childCount = children.length
      const spacing = LEVEL_HORIZONTAL_SPACING
      const groupWidth = (childCount - 1) * spacing
      
      // Calculate ideal center position (parent's X)
      const idealCenterX = parentPosition.x
      const groupStartX = idealCenterX - groupWidth / 2
      
      groupPositions.push({
        parentId,
        children,
        idealStartX: groupStartX,
        idealEndX: groupStartX + groupWidth,
        width: groupWidth,
      })
    })
    
    // Sort groups by their ideal start position
    groupPositions.sort((a, b) => a.idealStartX - b.idealStartX)
    
    // Position groups sequentially, ensuring no overlaps between groups
    let currentX = 0
    
    groupPositions.forEach((group) => {
      const { children, idealStartX, width } = group
      
      // Calculate where this group should start
      let groupStartX = idealStartX
      
      // If this would overlap with previous groups, shift it right
      if (currentX > groupStartX - SIBLING_GROUP_PADDING) {
        groupStartX = currentX + SIBLING_GROUP_PADDING
      }
      
      // Position all children in this group together
      // Use a sequential approach to ensure no overlaps within the group
      let groupCurrentX = groupStartX
      
      children.forEach((node, index) => {
        // Calculate ideal position within group
        const idealX = groupStartX + index * LEVEL_HORIZONTAL_SPACING
        
        // Use the larger of ideal position or current position to maintain group integrity
        if (groupCurrentX < idealX) {
          groupCurrentX = idealX
        }
        
        // Ensure no overlap with previously positioned nodes (including from other groups)
        // Also ensure we're not directly above another parent's child
        const nodeParentId = String(group.parentId)
        const finalX = findNonOverlappingX(groupCurrentX, y, positions, DEFAULT_LOCATION_WIDTH, DEFAULT_LOCATION_HEIGHT, MIN_NODE_GAP, nodeParentId, parentToChildren)
        
        const rawLevel = visualLevels.get(node.id) ?? visualLevel
        
        positions.set(node.id, {
          x: finalX,
          y,
          level: rawLevel,
          visualLevel: visualLevel,
          levelIndex: levelIndexCounter,
        })
        
        levelIndexCounter += 1
        if (finalX < globalMinX) globalMinX = finalX
        
        // Move to next position with guaranteed spacing
        groupCurrentX = finalX + LEVEL_HORIZONTAL_SPACING
      })
      
      // Update currentX to the end of this group with padding
      currentX = groupCurrentX + SIBLING_GROUP_PADDING
    })
    
    // Process orphan nodes at non-root levels (shouldn't happen, but handle it)
    if (orphans.length) {
      orphans.sort(compareNodes)
      // Start after all positioned children
      let orphanStartX = currentX + LEVEL_HORIZONTAL_SPACING
      
      orphans.forEach((node) => {
        const nodeParentId = null // Orphan nodes have no parent
        orphanStartX = findNonOverlappingX(orphanStartX, y, positions, DEFAULT_LOCATION_WIDTH, DEFAULT_LOCATION_HEIGHT, MIN_NODE_GAP, nodeParentId, parentToChildren)
        const x = orphanStartX
        const rawLevel = visualLevels.get(node.id) ?? visualLevel
        
        positions.set(node.id, {
          x,
          y,
          level: rawLevel,
          visualLevel: visualLevel,
          levelIndex: levelIndexCounter,
        })
        
        levelIndexCounter += 1
        orphanStartX += LEVEL_HORIZONTAL_SPACING
        if (x < globalMinX) globalMinX = x
      })
    }
  })
  
  // Adjust all positions to ensure nothing is left of X=0
  const xOffset = Number.isFinite(globalMinX) && globalMinX < 0 ? -globalMinX : 0
  const adjusted = new Map()
  
  if (xOffset > 0) {
    positions.forEach((value, key) => {
      adjusted.set(key, {
        x: value.x + xOffset,
        y: value.y,
        level: value.level,
        visualLevel: value.visualLevel,
        levelIndex: value.levelIndex,
      })
    })
  } else {
    positions.forEach((value, key) => {
      adjusted.set(key, value)
    })
  }
  
  return adjusted
}

/**
 * Converts location data to React Flow node format
 */
function normalizeLocationNode(location) {
  if (!location) return null
  
  const id = String(location.id)
  const name = location.name || `Location ${id}`
  const typeName = location.locationType?.name || location.location_type_name || 'Location'
  const parentId = location.parent_id ? String(location.parent_id) : null
  
  return {
    id,
    name,
    typeName,
    parentId,
    locationTypeId: location.location_type_id,
    childCount: location.childCount || 0,
    description: location.description || '',
  }
}

/**
 * Main function to layout location nodes hierarchically
 */
export function layoutLocationsHierarchically(locations, rootLocationId = null) {
  if (!Array.isArray(locations) || locations.length === 0) {
    return []
  }
  
  // Normalize location data - this converts parent_id to parentId
  const normalizedLocations = locations
    .map(normalizeLocationNode)
    .filter(Boolean)
  
  if (normalizedLocations.length === 0) return []
  
  // Build levels from parent_id relationships using normalized locations
  // normalizedLocations have parentId field (not parent_id)
  const { levels, centerId } = buildLevelsFromLocations(normalizedLocations, rootLocationId)
  
  // Debug: Log level distribution
  if (import.meta.env.DEV) {
    const levelCounts = new Map()
    levels.forEach((level) => {
      levelCounts.set(level, (levelCounts.get(level) || 0) + 1)
    })
    console.log('Location levels distribution:', Object.fromEntries(levelCounts))
    console.log('Total locations:', normalizedLocations.length)
    console.log('Root locations:', normalizedLocations.filter(loc => !loc.parentId).length)
  }
  
  // Convert to React Flow node format
  const nodes = normalizedLocations.map((loc) => {
    const parentId = loc.parentId || null
    return {
      id: loc.id,
      type: 'location',
      width: DEFAULT_LOCATION_WIDTH,
      height: DEFAULT_LOCATION_HEIGHT,
      position: { x: 0, y: 0 },
      data: {
        label: loc.name,
        typeName: loc.typeName,
        locationId: loc.id,
        parentId: parentId,
        childCount: loc.childCount,
        description: loc.description,
        locationTypeId: loc.locationTypeId,
      },
      parentId: parentId, // Store on node for easy access
    }
  })
  
  // Group nodes by level
  const { groups, visualLevels } = buildLevelGroups(levels, nodes)
  
  // Build parent-to-children map for preventing nodes from sitting above others' children
  const parentToChildren = new Map()
  nodes.forEach((node) => {
    const parentId = node.parentId ? String(node.parentId) : null
    if (parentId) {
      if (!parentToChildren.has(parentId)) {
        parentToChildren.set(parentId, [])
      }
      parentToChildren.get(parentId).push(String(node.id))
    }
  })
  
  // Assign positions (pass visualLevels to preserve raw level info and parentToChildren for collision avoidance)
  const positions = assignPositions(groups, visualLevels, parentToChildren)
  
  // Apply positions to nodes
  return nodes.map((node) => {
    if (!node || !node.id) return null
    
    const rawLevel = levels.get(node.id) ?? 0
    const visualLevel = visualLevels.get(node.id) ?? rawLevel
    const placement = positions.get(node.id) || {
      x: 0,
      y: visualLevel * LEVEL_VERTICAL_SPACING,
      level: visualLevel,
      visualLevel: visualLevel,
      levelIndex: 0,
    }
    
    // Ensure position values are valid numbers
    const x = typeof placement.x === 'number' && Number.isFinite(placement.x) ? placement.x : 0
    const y = typeof placement.y === 'number' && Number.isFinite(placement.y) ? placement.y : visualLevel * LEVEL_VERTICAL_SPACING
    
      return {
        ...node,
        id: String(node.id),
        type: node.type || 'location',
        width: DEFAULT_LOCATION_WIDTH,
        height: DEFAULT_LOCATION_HEIGHT,
        position: { x, y },
        data: {
          ...node.data,
          level: rawLevel,
          visualLevel: placement.visualLevel ?? visualLevel,
          levelIndex: placement.levelIndex ?? 0,
        },
      }
  }).filter(Boolean)
}

/**
 * Builds React Flow edges from location parent_id relationships
 */
export function buildLocationEdges(locations) {
  if (!Array.isArray(locations)) return []
  
  const edges = []
  
  locations.forEach((location) => {
    if (!location || !location.parent_id) return
    
    const sourceId = String(location.parent_id)
    const targetId = String(location.id)
    
    if (sourceId && targetId && sourceId !== targetId) {
      edges.push({
        id: `edge-${sourceId}-${targetId}`,
        source: sourceId,
        target: targetId,
        type: 'smoothstep',
        animated: false,
        style: { 
          stroke: '#64748b', 
          strokeWidth: 2,
          opacity: 0.8,
        },
        markerEnd: {
          type: 'arrowclosed',
          color: '#64748b',
        },
        data: {
          parentId: sourceId,
          childId: targetId,
        },
        sourceHandle: 'bottom',
        targetHandle: 'top',
      })
    }
  })
  
  return edges
}
