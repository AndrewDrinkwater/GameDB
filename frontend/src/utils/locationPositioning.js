// src/utils/locationPositioning.js
// Utility for calculating hierarchical positions for location nodes

// Fixed spacing constants for deterministic tree layout
const NODE_WIDTH = 200
const NODE_HEIGHT = 140
const H_SPACING = 50
const V_SPACING = 120

// Export for React Flow node dimensions
export const DEFAULT_LOCATION_WIDTH = NODE_WIDTH
export const DEFAULT_LOCATION_HEIGHT = NODE_HEIGHT

/**
 * Sorts children by metadata.orderIndex if present, then alphabetically by name
 */
function sortChildren(children, nodeMap) {
  return [...children].sort((a, b) => {
    const nodeA = nodeMap.get(a)
    const nodeB = nodeMap.get(b)
    
    if (!nodeA && !nodeB) return 0
    if (!nodeA) return 1
    if (!nodeB) return -1
    
    // Check for orderIndex in metadata
    const orderIndexA = nodeA.data?.metadata?.orderIndex ?? nodeA.metadata?.orderIndex
    const orderIndexB = nodeB.data?.metadata?.orderIndex ?? nodeB.metadata?.orderIndex
    
    if (orderIndexA !== undefined && orderIndexB !== undefined && orderIndexA !== orderIndexB) {
      return orderIndexA - orderIndexB
    }
    if (orderIndexA !== undefined && orderIndexB === undefined) return -1
    if (orderIndexA === undefined && orderIndexB !== undefined) return 1
    
    // Fallback to alphabetical by name
    const nameA = (nodeA.data?.label || nodeA.name || '').toLowerCase()
    const nameB = (nodeB.data?.label || nodeB.name || '').toLowerCase()
    
    return nameA.localeCompare(nameB)
  })
}

/**
 * Builds strict tree structure from parent_id relationships
 * Computes depth for every node (root = 0, children = parent depth + 1)
 * Attaches children array to each node
 * Applies collapse state from collapseState Map
 * Returns: { nodeMap: Map<id, node>, rootNodes: string[] }
 */
function buildTreeStructure(nodes, collapseState = null) {
  const nodeMap = new Map()
  const parentToChildren = new Map()
  
  // Build node map and parent-to-children map
  nodes.forEach((node) => {
    if (!node || !node.id) return
    const nodeId = String(node.id)
    nodeMap.set(nodeId, node)
    
    const parentId = node.parentId ? String(node.parentId) : null
    if (parentId) {
      if (!parentToChildren.has(parentId)) {
        parentToChildren.set(parentId, [])
      }
      parentToChildren.get(parentId).push(nodeId)
    }
  })
  
  // Attach children array to each node and compute depth
  const depth = new Map()
  const rootNodes = []
  
  nodeMap.forEach((node, nodeId) => {
    const children = parentToChildren.get(nodeId) || []
    // Sort children by orderIndex then name
    const sortedChildren = sortChildren(children, nodeMap)
    node.children = sortedChildren
    
    const parentId = node.parentId ? String(node.parentId) : null
    if (!parentId || !nodeMap.has(parentId)) {
      rootNodes.push(nodeId)
      depth.set(nodeId, 0)
    }
  })
  
  // Compute depth using BFS from root nodes
  const queue = rootNodes.map((id) => ({ id, level: 0 }))
  const visited = new Set(rootNodes)
  
  while (queue.length > 0) {
    const { id, level } = queue.shift()
    const node = nodeMap.get(id)
    const children = node?.children || []
    
    children.forEach((childId) => {
      if (!visited.has(childId)) {
        visited.add(childId)
        depth.set(childId, level + 1)
        queue.push({ id: childId, level: level + 1 })
      }
    })
  }
  
  // Ensure all nodes have a depth (orphans get depth 0)
  // Apply collapse state to nodes
  nodeMap.forEach((node, nodeId) => {
    if (!depth.has(nodeId)) {
      depth.set(nodeId, 0)
    }
    node.depth = depth.get(nodeId)
    // Apply collapse state (default to false if not in map)
    node.isCollapsed = collapseState ? (collapseState.get(nodeId) === true) : false
  })
  
  return { nodeMap, rootNodes }
}

/**
 * Computes subtree width for each node (bottom-up)
 * If node is collapsed: subtreeWidth = NODE_WIDTH (treated as leaf)
 * If node has no children: subtreeWidth = NODE_WIDTH
 * Else: subtreeWidth = sum(child.subtreeWidth) + H_SPACING * (childCount - 1)
 */
function computeSubtreeWidths(nodeMap) {
  // Process nodes bottom-up (from deepest to shallowest)
  const nodesByDepth = new Map()
  let maxDepth = 0
  
  nodeMap.forEach((node, nodeId) => {
    const depth = node.depth || 0
    if (depth > maxDepth) maxDepth = depth
    
    if (!nodesByDepth.has(depth)) {
      nodesByDepth.set(depth, [])
    }
    nodesByDepth.get(depth).push(nodeId)
  })
  
  // Process from deepest level to root
  for (let depth = maxDepth; depth >= 0; depth--) {
    const nodesAtDepth = nodesByDepth.get(depth) || []
    
    nodesAtDepth.forEach((nodeId) => {
      const node = nodeMap.get(nodeId)
      if (!node) return
      
      // If collapsed, treat as leaf (no children considered)
      if (node.isCollapsed) {
        node.subtreeWidth = NODE_WIDTH
        return
      }
      
      const children = node.children || []
      
      if (children.length === 0) {
        // No children: subtreeWidth = NODE_WIDTH
        node.subtreeWidth = NODE_WIDTH
      } else {
        // Has children: sum of child subtreeWidths + spacing
        let totalWidth = 0
        children.forEach((childId) => {
          const child = nodeMap.get(childId)
          if (child) {
            totalWidth += child.subtreeWidth || NODE_WIDTH
          }
        })
        node.subtreeWidth = totalWidth + H_SPACING * (children.length - 1)
      }
    })
  }
}

/**
 * Recursively layouts children of a parent node
 * Each sibling subtree gets its own horizontal "slot" based on subtreeWidth
 * Ensures parent is perfectly centered above children
 * Skips children if parent is collapsed
 */
function layoutChildren(parent, nodeMap) {
  if (!parent || !parent.children || parent.children.length === 0) {
    return
  }
  
  // If parent is collapsed, don't layout children
  if (parent.isCollapsed) {
    return
  }
  
  const totalWidth = parent.subtreeWidth || NODE_WIDTH
  let currentX = parent.x - totalWidth / 2
  
  parent.children.forEach((childId) => {
    const child = nodeMap.get(childId)
    if (!child) return
    
    const childSubtreeWidth = child.subtreeWidth || NODE_WIDTH
    const childCenterX = currentX + childSubtreeWidth / 2
    
    // Set child position
    child.x = childCenterX
    child.y = child.depth * (NODE_HEIGHT + V_SPACING)
    
    // Move to next sibling subtree
    currentX += childSubtreeWidth + H_SPACING
    
    // Recursively layout this child's children
    layoutChildren(child, nodeMap)
  })
}

/**
 * Assigns X/Y coordinates to all nodes (top-down)
 * Y coordinate: node.y = node.depth * (NODE_HEIGHT + V_SPACING)
 * X coordinate: computed recursively starting from root
 */
function assignCoordinates(nodeMap, rootNodes) {
  if (rootNodes.length === 0) return
  
  if (rootNodes.length === 1) {
    // Single root: position at root.x = root.subtreeWidth / 2
    const rootId = rootNodes[0]
    const root = nodeMap.get(rootId)
    if (!root) return
    
    root.x = (root.subtreeWidth || NODE_WIDTH) / 2
    root.y = 0
    
    // Layout children recursively
    layoutChildren(root, nodeMap)
  } else {
    // Multiple roots: position them with spacing
    let currentX = 0
    rootNodes.forEach((rootId) => {
      const root = nodeMap.get(rootId)
      if (!root) return
      
      const rootWidth = root.subtreeWidth || NODE_WIDTH
      root.x = currentX + rootWidth / 2
      root.y = 0
      
      // Layout children from this root
      layoutChildren(root, nodeMap)
      
      // Move to next root
      currentX += rootWidth + H_SPACING
    })
  }
  
  // Adjust all positions to ensure nothing is left of X=0
  let minX = Infinity
  nodeMap.forEach((node) => {
    if (node.x !== undefined && node.x < minX) {
      minX = node.x
    }
  })
  
  if (minX < 0) {
    const offset = -minX
    nodeMap.forEach((node) => {
      if (node.x !== undefined) {
        node.x += offset
      }
    })
  }
}

/**
 * Recursively collects visible nodes (nodes where all ancestors are expanded)
 * @param {Object} node - The node to check
 * @param {Map} nodeMap - Map of all nodes
 * @param {Array} result - Array to collect visible nodes (mutated)
 */
function collectVisibleNodes(node, nodeMap, result = []) {
  if (!node) return
  
  result.push(node)
  
  // If node is collapsed, don't include its children
  if (!node.isCollapsed && node.children) {
    node.children.forEach((childId) => {
      const child = nodeMap.get(childId)
      if (child) {
        collectVisibleNodes(child, nodeMap, result)
      }
    })
  }
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
    metadata: location.metadata || {}, // Preserve metadata for orderIndex
  }
}

/**
 * Main function to layout location nodes hierarchically
 * Implements deterministic tree layout according to final rule set
 * @param {Array} locations - Array of location objects
 * @param {string|null} rootLocationId - Optional root location ID
 * @param {Map<string, boolean>|null} collapseState - Map of node IDs to collapse state
 * @returns {Object} Object with { nodes: Array, visibleNodeIds: Set }
 */
export function layoutLocationsHierarchically(locations, rootLocationId = null, collapseState = null) {
  if (!Array.isArray(locations) || locations.length === 0) {
    return []
  }
  
  // Normalize location data - this converts parent_id to parentId
  const normalizedLocations = locations
    .map(normalizeLocationNode)
    .filter(Boolean)
  
  if (normalizedLocations.length === 0) return []
  
  // Convert to React Flow node format with metadata access
  const nodes = normalizedLocations.map((loc) => {
    const parentId = loc.parentId || null
    return {
      id: loc.id,
      type: 'location',
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      position: { x: 0, y: 0 },
      data: {
        label: loc.name,
        typeName: loc.typeName,
        locationId: loc.id,
        parentId: parentId,
        childCount: loc.childCount,
        description: loc.description,
        locationTypeId: loc.locationTypeId,
        metadata: loc.metadata || {}, // Preserve metadata for orderIndex
      },
      parentId: parentId, // Store on node for easy access
      metadata: loc.metadata || {}, // Also store at node level for easy access
    }
  })
  
  // Build tree structure (attaches children arrays and computes depth)
  // Pass collapseState to apply collapse state to nodes
  const { nodeMap, rootNodes } = buildTreeStructure(nodes, collapseState)
  
  // Debug: Log tree structure
  if (import.meta.env.DEV) {
    const depthCounts = new Map()
    nodeMap.forEach((node) => {
      const depth = node.depth || 0
      depthCounts.set(depth, (depthCounts.get(depth) || 0) + 1)
    })
    console.log('Location depth distribution:', Object.fromEntries(depthCounts))
    console.log('Total locations:', nodes.length)
    console.log('Root locations:', rootNodes.length)
  }
  
  // Compute subtree widths (bottom-up)
  computeSubtreeWidths(nodeMap)
  
  // Assign X/Y coordinates (top-down)
  assignCoordinates(nodeMap, rootNodes)
  
  // Collect visible nodes (all nodes where ancestors are expanded)
  const visibleNodes = []
  rootNodes.forEach((rootId) => {
    const root = nodeMap.get(rootId)
    if (root) {
      collectVisibleNodes(root, nodeMap, visibleNodes)
    }
  })
  const visibleNodeIds = new Set(visibleNodes.map((n) => String(n.id)))
  
  // Convert back to React Flow node format
  return {
    nodes: nodes.map((node) => {
    if (!node || !node.id) return null
    
    const nodeId = String(node.id)
    const treeNode = nodeMap.get(nodeId)
    
    if (!treeNode) return null
    
    const x = typeof treeNode.x === 'number' && Number.isFinite(treeNode.x) ? treeNode.x : 0
    const y = typeof treeNode.y === 'number' && Number.isFinite(treeNode.y) ? treeNode.y : (treeNode.depth || 0) * (NODE_HEIGHT + V_SPACING)
    const nodeDepth = treeNode.depth || 0
    
    return {
      ...node,
      id: nodeId,
      type: node.type || 'location',
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      position: { x, y },
      data: {
        ...node.data,
        level: nodeDepth,
        visualLevel: nodeDepth,
        levelIndex: 0,
      },
    }
  }).filter(Boolean),
    visibleNodeIds: visibleNodeIds,
  }
}

/**
 * Builds React Flow edges from location parent_id relationships
 * Only includes edges where both source and target are visible
 * @param {Array} locations - Array of location objects
 * @param {Set<string>|null} visibleNodeIds - Set of visible node IDs (optional)
 */
export function buildLocationEdges(locations, visibleNodeIds = null) {
  if (!Array.isArray(locations)) return []
  
  const edges = []
  
  locations.forEach((location) => {
    if (!location || !location.parent_id) return
    
    const sourceId = String(location.parent_id)
    const targetId = String(location.id)
    
    // Filter: only include edges where both nodes are visible
    if (visibleNodeIds) {
      if (!visibleNodeIds.has(sourceId) || !visibleNodeIds.has(targetId)) {
        return
      }
    }
    
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
