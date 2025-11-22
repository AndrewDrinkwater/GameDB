// src/utils/locationTypeHierarchy.js

/**
 * Get all ancestor type IDs for a given location type
 * Traverses the parent_type_id chain upward to find all ancestors
 * (parent, grandparent, great-grandparent, etc.)
 * 
 * @param {string} typeId - The location type ID to find ancestors for
 * @param {Array} allTypes - Array of all location types with id and parent_type_id
 * @returns {Array<string>} Array of ancestor type IDs (including the type itself if includeSelf is true)
 */
export function getAncestorTypeIds(typeId, allTypes, includeSelf = false) {
  if (!typeId || !Array.isArray(allTypes) || allTypes.length === 0) {
    return []
  }

  const typeMap = new Map()
  allTypes.forEach((type) => {
    const id = type.id || type.type_id || ''
    if (id) {
      typeMap.set(String(id), type)
      // Also ensure parent_type_id is accessible - it might be nested in parentType
      if (!type.parent_type_id && type.parentType?.id) {
        type.parent_type_id = type.parentType.id
      }
    }
  })

  const ancestorIds = new Set()
  if (includeSelf) {
    ancestorIds.add(String(typeId))
  }

  let currentTypeId = String(typeId)
  const visited = new Set()

  // Traverse upward through parent_type_id chain
  while (currentTypeId && !visited.has(currentTypeId)) {
    visited.add(currentTypeId)
    const currentType = typeMap.get(currentTypeId)
    
    if (!currentType) break

    const parentTypeId = 
      currentType.parent_type_id || 
      currentType.parentTypeId || 
      currentType.parentType?.id || 
      null

    if (parentTypeId) {
      const parentIdStr = String(parentTypeId)
      ancestorIds.add(parentIdStr)
      currentTypeId = parentIdStr
    } else {
      break
    }
  }

  return Array.from(ancestorIds)
}

/**
 * Get all descendant type IDs for a given location type
 * Traverses the parent_type_id chain downward recursively to find all descendants
 * (child, grandchild, great-grandchild, etc.)
 * 
 * @param {string} typeId - The location type ID to find descendants for
 * @param {Array} allTypes - Array of all location types with id and parent_type_id
 * @returns {Array<string>} Array of descendant type IDs
 */
export function getDescendantTypeIds(typeId, allTypes) {
  if (!typeId || !Array.isArray(allTypes) || allTypes.length === 0) {
    return []
  }

  const typeMap = new Map()
  const childrenMap = new Map() // parent_id -> [child types]

  allTypes.forEach((type) => {
    const id = type.id || type.type_id || ''
    if (id) {
      typeMap.set(String(id), type)
      
      const parentId = 
        type.parent_type_id || 
        type.parentTypeId || 
        type.parentType?.id || 
        null

      if (parentId) {
        const parentIdStr = String(parentId)
        if (!childrenMap.has(parentIdStr)) {
          childrenMap.set(parentIdStr, [])
        }
        childrenMap.get(parentIdStr).push(String(id))
      }
    }
  })

  const descendantIds = new Set()
  const queue = [String(typeId)]
  const visited = new Set()

  // BFS traversal to find all descendants
  while (queue.length > 0) {
    const currentId = queue.shift()
    if (visited.has(currentId)) continue
    visited.add(currentId)

    const children = childrenMap.get(currentId) || []
    children.forEach((childId) => {
      if (!visited.has(childId)) {
        descendantIds.add(childId)
        queue.push(childId)
      }
    })
  }

  return Array.from(descendantIds)
}

/**
 * Get only direct child type IDs for a given location type
 * Returns only types that have this type as their direct parent
 * (not grandchild, great-grandchild, etc.)
 * 
 * @param {string} typeId - The location type ID to find direct children for
 * @param {Array} allTypes - Array of all location types with id and parent_type_id
 * @returns {Array<string>} Array of direct child type IDs only
 */
export function getDirectChildTypeIds(typeId, allTypes) {
  if (!typeId || !Array.isArray(allTypes) || allTypes.length === 0) {
    return []
  }

  const parentIdStr = String(typeId)
  const directChildren = []

  // Ensure parent_type_id is accessible for all types
  allTypes.forEach((type) => {
    const id = type.id || type.type_id || ''
    if (!id) return
    
    // Also ensure parent_type_id is accessible - it might be nested in parentType
    if (!type.parent_type_id && type.parentType?.id) {
      type.parent_type_id = type.parentType.id
    }
  })

  allTypes.forEach((type) => {
    const id = type.id || type.type_id || ''
    if (!id) return

    const parentId = 
      type.parent_type_id || 
      type.parentTypeId || 
      type.parentType?.id || 
      null

    const parentIdStrCheck = parentId ? String(parentId) : ''
    
    // Only include types that have this type as their DIRECT parent
    if (parentIdStrCheck === parentIdStr) {
      directChildren.push(String(id))
    }
  })

  return directChildren
}

