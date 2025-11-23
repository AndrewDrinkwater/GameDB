import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  applyEdgeChanges,
  applyNodeChanges,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { fetchLocations, updateLocation } from '../../api/locations.js'
import { fetchLocationTypes } from '../../api/locationTypes.js'
import { useCampaignContext } from '../../context/CampaignContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import LocationNode from '../../components/nodes/LocationNode.jsx'
import QuickLocationForm from '../../components/locations/QuickLocationForm.jsx'
import LocationInfoDrawer from '../../components/locations/LocationInfoDrawer.jsx'
import { fetchLocationById } from '../../api/locations.js'
import { getLocationTypeFields } from '../../api/locationTypeFields.js'
import {
  layoutLocationsHierarchically,
  buildLocationEdges,
} from '../../utils/locationPositioning.js'
import { Search, Plus, X } from 'lucide-react'
import { ENTITY_CREATION_SCOPES } from '../../utils/worldCreationScopes.js'

const nodeTypes = {
  location: LocationNode,
}

const MANAGER_ROLES = new Set(['system_admin'])

// Helper function to check if a type is a descendant of another type in the type hierarchy
function isTypeDescendant(typeId, ancestorTypeId, locationTypes) {
  if (!typeId || !ancestorTypeId || !locationTypes) return false
  if (String(typeId) === String(ancestorTypeId)) return false // A type is not its own descendant

  const type = locationTypes.find((t) => String(t.id) === String(typeId))
  if (!type) return false

  // Walk up the parent chain to see if we reach the ancestor
  const visited = new Set()
  let current = type

  while (current) {
    if (visited.has(String(current.id))) break // Prevent infinite loops
    visited.add(String(current.id))

    const parentTypeId = current.parent_type_id || current.parentTypeId
    if (!parentTypeId) break

    if (String(parentTypeId) === String(ancestorTypeId)) {
      return true // Found the ancestor in the chain
    }

    current = locationTypes.find((t) => String(t.id) === String(parentTypeId))
    if (!current) break
  }

  return false
}

// Helper function to get all descendant types for a parent location type (not just direct children)
function getValidChildTypes(parentTypeId, allLocationTypes) {
  if (!parentTypeId || !allLocationTypes || allLocationTypes.length === 0) {
    return allLocationTypes // If no parent type, allow all types
  }

  // Find all location types that are descendants of the parent type in the type hierarchy
  return allLocationTypes.filter((type) => {
    return isTypeDescendant(type.id, parentTypeId, allLocationTypes)
  })
}

// Helper function to check if a child type can be a child of a parent type
// A child type can be added if it's a descendant of the parent type in the type hierarchy
function canBeChild(childTypeId, parentTypeId, locationTypes) {
  if (!childTypeId || !parentTypeId || !locationTypes) return false

  // Check if child type is a descendant of parent type
  return isTypeDescendant(childTypeId, parentTypeId, locationTypes)
}

// Helper function to get all ancestor locations (walk up parent chain)
function getLocationAncestors(locationId, locations) {
  const ancestors = []
  const visited = new Set()
  let current = locations.find((loc) => loc && String(loc.id) === String(locationId))

  while (current && current.parent_id) {
    if (visited.has(String(current.id))) break // Prevent infinite loops
    visited.add(String(current.id))

    const parentId = String(current.parent_id)
    const parent = locations.find((loc) => loc && String(loc.id) === parentId)
    if (parent) {
      ancestors.push(parent)
      current = parent
    } else {
      break
    }
  }

  return ancestors
}

// Helper function to get all descendant locations (walk down child chain recursively)
function getLocationDescendants(locationId, locations) {
  const descendants = []
  const visited = new Set()

  function collectDescendants(parentId) {
    if (visited.has(String(parentId))) return // Prevent infinite loops
    visited.add(String(parentId))

    const children = locations.filter(
      (loc) => loc && loc.parent_id && String(loc.parent_id) === String(parentId)
    )

    for (const child of children) {
      descendants.push(child)
      collectDescendants(child.id)
    }
  }

  collectDescendants(locationId)
  return descendants
}

export default function LocationBuilderPage() {
  const {
    activeWorldId,
    selectedCampaignId,
    contextKey,
    activeWorld,
    selectedCampaign,
    selectedContextType,
  } = useCampaignContext()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [locations, setLocations] = useState([])
  const [locationTypes, setLocationTypes] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showQuickForm, setShowQuickForm] = useState(false)
  const [quickFormParentId, setQuickFormParentId] = useState(null)
  const [allowedLocationTypes, setAllowedLocationTypes] = useState(null)
  const [selectedLocationId, setSelectedLocationId] = useState(null)
  const [showParentSelector, setShowParentSelector] = useState(false)
  const [orphanToConnect, setOrphanToConnect] = useState(null)
  const [infoDrawerLocationId, setInfoDrawerLocationId] = useState(null)
  const [infoDrawerLocation, setInfoDrawerLocation] = useState(null)
  const [infoDrawerLoading, setInfoDrawerLoading] = useState(false)
  const [infoDrawerError, setInfoDrawerError] = useState('')
  const [infoDrawerFields, setInfoDrawerFields] = useState([])
  const [focusedLocationId, setFocusedLocationId] = useState(null)
  const dragStartPositions = useRef(new Map())
  const reactFlowInstance = useRef(null)
  const shouldPreserveViewport = useRef(false)
  const hasInitialFit = useRef(false)
  const parentToFocusAfterCreation = useRef(null) // Track parent location to focus after creating a child
  const [dragHoverTarget, setDragHoverTarget] = useState(null) // { nodeId, isValid }
  const [draggingNodeId, setDraggingNodeId] = useState(null)
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)


  const membershipRole = useMemo(() => {
    if (!selectedCampaign || !user) return ''
    const member = selectedCampaign.members?.find((entry) => entry.user_id === user.id)
    return member?.role || ''
  }, [selectedCampaign, user])

  const isWorldOwner = useMemo(() => {
    if (!activeWorld || !user?.id) return false
    const ownerId =
      activeWorld.created_by ||
      activeWorld.creator?.id ||
      activeWorld.owner_id ||
      activeWorld.owner?.id ||
      ''
    return ownerId ? String(ownerId) === String(user.id) : false
  }, [activeWorld, user?.id])

  const canManage = useMemo(() => {
    if (!user) return false
    if (MANAGER_ROLES.has(user.role)) return true
    if (!activeWorldId) return false
    if (selectedContextType === 'world') {
      return isWorldOwner
    }
    if (selectedCampaign) {
      if (membershipRole === 'dm') return true
      if (isWorldOwner) return true
    }
    return false
  }, [
    user,
    activeWorldId,
    selectedContextType,
    selectedCampaign,
    membershipRole,
    isWorldOwner,
  ])

  const entityCreationScope = activeWorld?.entity_creation_scope ?? ''

  const canPlayerCreateLocations = useMemo(() => {
    if (!selectedCampaignId || !selectedCampaign || !user) return false
    if (entityCreationScope !== ENTITY_CREATION_SCOPES.ALL_PLAYERS) return false
    return membershipRole === 'player'
  }, [selectedCampaignId, selectedCampaign, user, entityCreationScope, membershipRole])

  const canCreateLocations = canManage || canPlayerCreateLocations

  const loadLocations = useCallback(async () => {
    if (!activeWorldId) return

    setLoading(true)
    setError(null)
    try {
      const res = await fetchLocations({
        worldId: activeWorldId,
        all: 'true', // Get all locations for hierarchy
      })
      setLocations(res?.data || [])
    } catch (err) {
      console.error('Failed to load locations:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [activeWorldId, contextKey])

  const loadLocationTypes = useCallback(async () => {
    if (!activeWorldId) return

    try {
      const res = await fetchLocationTypes({ worldId: activeWorldId })
      setLocationTypes(res?.data || [])
    } catch (err) {
      console.error('Failed to load location types:', err)
    }
  }, [activeWorldId])

  useEffect(() => {
    loadLocations()
  }, [loadLocations])

  useEffect(() => {
    loadLocationTypes()
  }, [loadLocationTypes])

  // Load location data when info drawer is opened
  useEffect(() => {
    if (!infoDrawerLocationId) {
      setInfoDrawerLocation(null)
      setInfoDrawerLoading(false)
      setInfoDrawerError('')
      setInfoDrawerFields([])
      return
    }

    let cancelled = false

    const loadLocationData = async () => {
      setInfoDrawerLoading(true)
      setInfoDrawerError('')
      
      try {
        const locationResponse = await fetchLocationById(infoDrawerLocationId).catch((err) => {
          console.error('Failed to load location:', err)
          return null
        })

        if (cancelled) return

        const location = locationResponse?.data || locationResponse
        if (location) {
          setInfoDrawerLocation(location)
          
          // Load fields based on location type
          const typeId = location.location_type_id || location.locationType?.id
          if (typeId) {
            try {
              const fieldsResponse = await getLocationTypeFields(typeId)
              if (cancelled) return
              const fields = Array.isArray(fieldsResponse?.data)
                ? fieldsResponse.data
                : Array.isArray(fieldsResponse)
                  ? fieldsResponse
                  : []
              setInfoDrawerFields(fields)
            } catch (fieldsErr) {
              console.error('Failed to load location type fields:', fieldsErr)
              setInfoDrawerFields([])
            }
          } else {
            setInfoDrawerFields([])
          }
        } else {
          setInfoDrawerError('Location not found')
          setInfoDrawerFields([])
        }
      } catch (err) {
        if (cancelled) return
        console.error('Failed to load location data:', err)
        setInfoDrawerError(err.message || 'Failed to load location information')
        setInfoDrawerFields([])
      } finally {
        if (!cancelled) {
          setInfoDrawerLoading(false)
        }
      }
    }

    loadLocationData()

    return () => {
      cancelled = true
    }
  }, [infoDrawerLocationId])

  // Get search results for dropdown (all locations, not filtered by focus mode)
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []
    
    const query = searchQuery.toLowerCase().trim()
    return locations.filter(
      (loc) =>
        loc.name?.toLowerCase().includes(query) ||
        loc.description?.toLowerCase().includes(query) ||
        loc.locationType?.name?.toLowerCase().includes(query)
    ).slice(0, 10) // Limit to 10 results
  }, [locations, searchQuery])

  // Filter locations based on type and focus mode (search only affects dropdown, not board)
  const filteredLocations = useMemo(() => {
    let filtered = locations

    // Apply focus mode filter first
    if (focusedLocationId) {
      const focusedLocation = locations.find(
        (loc) => loc && String(loc.id) === String(focusedLocationId)
      )
      if (focusedLocation) {
        const ancestors = getLocationAncestors(focusedLocationId, locations)
        const descendants = getLocationDescendants(focusedLocationId, locations)
        const focusSet = new Set([
          String(focusedLocationId),
          ...ancestors.map((loc) => String(loc.id)),
          ...descendants.map((loc) => String(loc.id)),
        ])
        filtered = filtered.filter((loc) => focusSet.has(String(loc.id)))
      }
    }

    // Note: searchQuery is NOT used here - it only affects the dropdown results
    // The board should always show all locations (or focused subset)

    return filtered
  }, [locations, focusedLocationId])

  const handleSearchLocationClick = useCallback((locationId) => {
    // Don't apply focus mode, just move camera to the location
    setSearchQuery('')
    setShowSearchDropdown(false)
    
    // Find the node and move camera to its position without zooming
    requestAnimationFrame(() => {
      if (reactFlowInstance.current) {
        const node = reactFlowInstance.current.getNode(String(locationId))
        if (node) {
          // Get current viewport
          const viewport = reactFlowInstance.current.getViewport()
          
          // Get the React Flow container to determine viewport size
          const flowElement = document.querySelector('.react-flow')
          const viewportWidth = flowElement?.clientWidth || 800
          const viewportHeight = flowElement?.clientHeight || 600
          
          // Use positionAbsolute if available, otherwise use position
          const nodeX = node.positionAbsolute?.x ?? node.position?.x ?? 0
          const nodeY = node.positionAbsolute?.y ?? node.position?.y ?? 0
          const nodeWidth = node.width || 120
          const nodeHeight = node.height || 120
          
          // Calculate center position of the node
          const nodeCenterX = nodeX + nodeWidth / 2
          const nodeCenterY = nodeY + nodeHeight / 2
          
          // Center the node in the viewport (accounting for current zoom)
          const newX = -nodeCenterX * viewport.zoom + viewportWidth / 2
          const newY = -nodeCenterY * viewport.zoom + viewportHeight / 2
          
          reactFlowInstance.current.setViewport(
            { x: newX, y: newY, zoom: viewport.zoom },
            { duration: 400 }
          )
        }
      }
    })
  }, [])

  // Restore viewport after nodes are updated
  useEffect(() => {
    if (shouldPreserveViewport.current && reactFlowInstance.current && window.__locationBuilderViewport) {
      const viewport = window.__locationBuilderViewport
      // Use multiple requestAnimationFrame calls to ensure nodes are fully rendered
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (reactFlowInstance.current && window.__locationBuilderViewport) {
            reactFlowInstance.current.setViewport(viewport, { duration: 0 }) // Instant restore, no animation
            shouldPreserveViewport.current = false
            window.__locationBuilderViewport = null
          }
        })
      })
    } else if (parentToFocusAfterCreation.current && reactFlowInstance.current && nodes.length > 0) {
      // Move camera to parent location after creating a child
      const parentId = parentToFocusAfterCreation.current
      parentToFocusAfterCreation.current = null // Clear the ref
      
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (reactFlowInstance.current) {
            const node = reactFlowInstance.current.getNode(parentId)
            if (node) {
              // Get current viewport
              const viewport = reactFlowInstance.current.getViewport()
              
              // Get the React Flow container to determine viewport size
              const flowElement = document.querySelector('.react-flow')
              const viewportWidth = flowElement?.clientWidth || 800
              const viewportHeight = flowElement?.clientHeight || 600
              
              // Use positionAbsolute if available, otherwise use position
              const nodeX = node.positionAbsolute?.x ?? node.position?.x ?? 0
              const nodeY = node.positionAbsolute?.y ?? node.position?.y ?? 0
              const nodeWidth = node.width || 120
              const nodeHeight = node.height || 120
              
              // Calculate center position of the node
              const nodeCenterX = nodeX + nodeWidth / 2
              const nodeCenterY = nodeY + nodeHeight / 2
              
              // Center the node in the viewport (accounting for current zoom)
              const newX = -nodeCenterX * viewport.zoom + viewportWidth / 2
              const newY = -nodeCenterY * viewport.zoom + viewportHeight / 2
              
              reactFlowInstance.current.setViewport(
                { x: newX, y: newY, zoom: viewport.zoom },
                { duration: 400 }
              )
            }
          }
        })
      })
    } else if (!hasInitialFit.current && reactFlowInstance.current && nodes.length > 0) {
      // Only fit view on initial load
      requestAnimationFrame(() => {
        if (reactFlowInstance.current && !hasInitialFit.current) {
          reactFlowInstance.current.fitView({ padding: 0.2 })
          hasInitialFit.current = true
        }
      })
    }
  }, [nodes, edges])

  // Build graph nodes and edges from filtered locations
  useEffect(() => {
    if (!filteredLocations.length) {
      setNodes([])
      setEdges([])
      return
    }

    try {
      // Find root location (first root location, focused one, or selected one)
      const rootLocation = focusedLocationId
        ? filteredLocations.find((loc) => loc && String(loc.id) === String(focusedLocationId))
        : selectedLocationId
          ? filteredLocations.find((loc) => loc && String(loc.id) === String(selectedLocationId))
          : filteredLocations.find((loc) => loc && !loc.parent_id)

      const rootId = rootLocation ? String(rootLocation.id) : null

      // Layout nodes hierarchically
      const layoutedNodes = layoutLocationsHierarchically(filteredLocations, rootId)

      if (!Array.isArray(layoutedNodes) || layoutedNodes.length === 0) {
        setNodes([])
        setEdges([])
        return
      }

      // Preserve positions of nodes that are currently being dragged
      const currentNodesMap = new Map()
      nodes.forEach((node) => {
        if (node && node.id) {
          currentNodesMap.set(String(node.id), node)
        }
      })

      // Add event handlers to nodes and ensure all required properties
      const nodesWithHandlers = layoutedNodes
        .filter((node) => {
          // Strict validation - ensure node exists and has required properties
          if (!node || !node.id) return false
          return true
        })
        .map((node) => {
          const nodeId = String(node.id)
          // If node is currently being dragged, preserve its current position
          const isBeingDragged = draggingNodeId === nodeId
          const existingNode = currentNodesMap.get(nodeId)
          
          let position
          if (isBeingDragged && existingNode && existingNode.position) {
            // Preserve the dragged position
            position = existingNode.position
          } else {
            // Use layout position
            const layoutPosition = node.position || { x: 0, y: 0 }
            position = {
              x: typeof layoutPosition.x === 'number' && Number.isFinite(layoutPosition.x) ? layoutPosition.x : 0,
              y: typeof layoutPosition.y === 'number' && Number.isFinite(layoutPosition.y) ? layoutPosition.y : 0,
            }
          }

          return {
            id: nodeId,
            type: node.type || 'location',
            width: 120,
            height: 120,
            position,
            draggable: true,
            data: {
              label: node.data?.label || String(node.id),
              typeName: node.data?.typeName || 'Location',
              locationId: String(node.id),
              parentId: node.data?.parentId || node.parentId || null,
              childCount: node.data?.childCount || 0,
              description: node.data?.description || '',
              locationTypeId: node.data?.locationTypeId || null,
              dragHoverState:
                draggingNodeId && dragHoverTarget?.nodeId === String(node.id)
                  ? dragHoverTarget.isValid
                    ? 'valid'
                    : 'invalid'
                  : null,
              isFocused: focusedLocationId === String(node.id),
              onAddChild: canCreateLocations
                ? (parentId) => {
                    setQuickFormParentId(parentId)
                    // Find parent location to get its type
                    const parentLocation = filteredLocations.find(
                      (loc) => loc && String(loc.id) === String(parentId)
                    )
                    if (parentLocation && parentLocation.location_type_id) {
                      // Filter types to only show valid children
                      const validTypes = getValidChildTypes(
                        parentLocation.location_type_id,
                        locationTypes
                      )
                      setAllowedLocationTypes(validTypes.length > 0 ? validTypes : locationTypes)
                    } else {
                      // No parent type restriction, allow all types
                      setAllowedLocationTypes(null)
                    }
                    setShowQuickForm(true)
                  }
                : undefined,
              onSetParent: canCreateLocations
                ? (locationId) => {
                    setOrphanToConnect(locationId)
                    setShowParentSelector(true)
                  }
                : undefined,
              onOpenInfo: (locationId) => {
                setInfoDrawerLocationId(locationId)
              },
            },
          }
        })

      // Build edges from parent_id relationships
      const locationEdges = buildLocationEdges(filteredLocations)

      // Only set nodes if we have valid nodes
      if (nodesWithHandlers.length > 0) {
        setNodes(nodesWithHandlers)
        setEdges(locationEdges || [])
      } else {
        setNodes([])
        setEdges([])
      }
    } catch (err) {
      console.error('Error building location graph:', err)
      setError(err.message || 'Failed to build location graph')
      setNodes([])
      setEdges([])
    }
  }, [filteredLocations, selectedLocationId, focusedLocationId, canCreateLocations, navigate, draggingNodeId, dragHoverTarget])

  const onNodesChange = useCallback((changes) => {
    setNodes((nds) => applyNodeChanges(changes, nds))
  }, [])

  const onEdgesChange = useCallback((changes) => {
    setEdges((eds) => applyEdgeChanges(changes, eds))
  }, [])

  const handleNodeDoubleClick = useCallback(
    (event, node) => {
      if (!node) return
      const locationId = node.data?.locationId || node.id
      if (locationId) {
        setFocusedLocationId(String(locationId))
        
        // Center the camera on the focused node with less zoom
        // Use requestAnimationFrame to ensure the node is in the updated nodes list
        requestAnimationFrame(() => {
          if (reactFlowInstance.current) {
            reactFlowInstance.current.fitView({
              nodes: [{ id: String(locationId) }],
              padding: 0.6, // Increased padding = less zoom
              duration: 400,
            })
          }
        })
      }
    },
    []
  )

  const handleShowAll = useCallback(() => {
    setFocusedLocationId(null)
  }, [])

  const handleNodeDragStart = useCallback((event, node) => {
    // Store initial position when drag starts
    if (node && node.id) {
      dragStartPositions.current.set(String(node.id), {
        x: node.position.x,
        y: node.position.y,
      })
      setDraggingNodeId(String(node.id))
    }
  }, [])

  const handleNodeDrag = useCallback(
    (event, draggedNode) => {
      if (!draggedNode || !canCreateLocations || !draggingNodeId) {
        setDragHoverTarget(null)
        return
      }

      const draggedLocationId = draggedNode.data?.locationId || draggedNode.id
      if (!draggedLocationId) {
        setDragHoverTarget(null)
        return
      }

      // Find the dragged location
      const draggedLocation = locations.find(
        (loc) => loc && String(loc.id) === String(draggedLocationId)
      )
      if (!draggedLocation) {
        setDragHoverTarget(null)
        return
      }

      // Check if hovering over another node
      const draggedX = draggedNode.position.x + (draggedNode.width || 120) / 2
      const draggedY = draggedNode.position.y + (draggedNode.height || 120) / 2

      const DROP_THRESHOLD = 250

      let targetNode = null
      let minDistance = Infinity

      for (const node of nodes) {
        if (String(node.id) === String(draggedNode.id)) continue

        const nodeLeft = node.position.x
        const nodeRight = node.position.x + (node.width || 120)
        const nodeTop = node.position.y
        const nodeBottom = node.position.y + (node.height || 120)
        const nodeCenterX = nodeLeft + (node.width || 120) / 2
        const nodeCenterY = nodeTop + (node.height || 120) / 2

        const overlaps =
          draggedX > nodeLeft &&
          draggedX < nodeRight &&
          draggedY > nodeTop &&
          draggedY < nodeBottom

        const distance = Math.sqrt(
          Math.pow(draggedX - nodeCenterX, 2) + Math.pow(draggedY - nodeCenterY, 2)
        )

        if (overlaps || distance < DROP_THRESHOLD) {
          if (distance < minDistance) {
            targetNode = node
            minDistance = distance
          }
        }
      }

      if (!targetNode) {
        setDragHoverTarget(null)
        return
      }

      const targetLocationId = targetNode.data?.locationId || targetNode.id
      if (!targetLocationId || String(targetLocationId) === String(draggedLocationId)) {
        setDragHoverTarget(null)
        return
      }

      // Find the target location
      const targetLocation = locations.find(
        (loc) => loc && String(loc.id) === String(targetLocationId)
      )
      if (!targetLocation) {
        setDragHoverTarget(null)
        return
      }

      // Don't show feedback if target is already the parent
      if (String(draggedLocation.parent_id) === String(targetLocationId)) {
        setDragHoverTarget(null)
        return
      }

      // Validate type compatibility
      const draggedTypeId = draggedLocation.location_type_id
      const targetTypeId = targetLocation.location_type_id

      const typeValid = canBeChild(draggedTypeId, targetTypeId, locationTypes)

      // Check for circular references - only prevent if target is a descendant of dragged location
      // (Allow moving to ancestors)
      const wouldCreateCycle = (() => {
        // Check if targetLocation is a descendant of draggedLocation
        const checkIfDescendant = (parentId, childId, visited = new Set()) => {
          if (visited.has(String(parentId))) return false
          visited.add(String(parentId))
          
          if (String(parentId) === String(childId)) return true
          
          const children = locations.filter(
            (loc) => loc && loc.parent_id && String(loc.parent_id) === String(parentId)
          )
          
          for (const child of children) {
            if (String(child.id) === String(childId)) return true
            if (checkIfDescendant(child.id, childId, visited)) return true
          }
          
          return false
        }
        
        return checkIfDescendant(draggedLocationId, targetLocationId)
      })()

      const isValid = typeValid && !wouldCreateCycle

      setDragHoverTarget({
        nodeId: String(targetNode.id),
        isValid,
      })
    },
    [nodes, locations, locationTypes, canCreateLocations, draggingNodeId]
  )

  const handleNodeDragStop = useCallback(
    async (event, draggedNode) => {
      if (!draggedNode || !canCreateLocations) {
        dragStartPositions.current.delete(String(draggedNode?.id))
        return
      }

      const draggedLocationId = draggedNode.data?.locationId || draggedNode.id
      if (!draggedLocationId) {
        dragStartPositions.current.delete(String(draggedNode?.id))
        return
      }

      // Check if node was actually moved (not just a click)
      const startPos = dragStartPositions.current.get(String(draggedNode.id))
      const movedDistance = startPos
        ? Math.sqrt(
            Math.pow(draggedNode.position.x - startPos.x, 2) +
              Math.pow(draggedNode.position.y - startPos.y, 2)
          )
        : 0

      dragStartPositions.current.delete(String(draggedNode.id))
      setDraggingNodeId(null)
      setDragHoverTarget(null)

      // If node wasn't moved significantly, don't treat as a drag
      if (movedDistance < 10) {
        return
      }

      // Find the dragged location
      const draggedLocation = locations.find(
        (loc) => loc && String(loc.id) === String(draggedLocationId)
      )
      if (!draggedLocation) {
        return
      }

      // Use current nodes from state (they're already updated by React Flow)
      const currentNodes = nodes
      
      // Check if dropped over another node by checking node positions
      // Use bounding box intersection for more reliable detection
      const draggedLeft = draggedNode.position.x
      const draggedRight = draggedNode.position.x + (draggedNode.width || 120)
      const draggedTop = draggedNode.position.y
      const draggedBottom = draggedNode.position.y + (draggedNode.height || 120)
      const draggedCenterX = draggedLeft + (draggedNode.width || 120) / 2
      const draggedCenterY = draggedTop + (draggedNode.height || 120) / 2

      const DROP_THRESHOLD = 250 // Distance threshold for considering a drop

      let targetNode = null
      let minDistance = Infinity
      
      for (const node of currentNodes) {
        if (String(node.id) === String(draggedNode.id)) continue

        const nodeLeft = node.position.x
        const nodeRight = node.position.x + (node.width || 120)
        const nodeTop = node.position.y
        const nodeBottom = node.position.y + (node.height || 120)
        const nodeCenterX = nodeLeft + (node.width || 120) / 2
        const nodeCenterY = nodeTop + (node.height || 120) / 2

        // Check for bounding box overlap first (more reliable)
        const overlaps =
          draggedLeft < nodeRight &&
          draggedRight > nodeLeft &&
          draggedTop < nodeBottom &&
          draggedBottom > nodeTop

        // Also check center-to-center distance as fallback
        const distance = Math.sqrt(
          Math.pow(draggedCenterX - nodeCenterX, 2) + Math.pow(draggedCenterY - nodeCenterY, 2)
        )

        if (overlaps || distance < DROP_THRESHOLD) {
          if (distance < minDistance) {
            targetNode = node
            minDistance = distance
          }
        }
      }

      if (!targetNode) {
        // Not dropped on another node - don't reset position, let user keep it where they dragged it
        return
      }

      const targetLocationId = targetNode.data?.locationId || targetNode.id
      if (!targetLocationId) {
        // Invalid target - don't reset, let user keep position
        return
      }

      // Don't allow dropping on itself
      if (String(targetLocationId) === String(draggedLocationId)) {
        // Dropped on itself - don't reset, let user keep position
        return
      }

      // Find the target location
      const targetLocation = locations.find(
        (loc) => loc && String(loc.id) === String(targetLocationId)
      )
      if (!targetLocation) {
        // Target not found - don't reset, let user keep position
        return
      }

      // Don't allow dropping if target is already the parent (no change needed)
      if (String(draggedLocation.parent_id) === String(targetLocationId)) {
        // Already the parent - don't reset, let user keep position
        return
      }

      // Validate type compatibility
      const draggedTypeId = draggedLocation.location_type_id
      const targetTypeId = targetLocation.location_type_id

      if (!canBeChild(draggedTypeId, targetTypeId, locationTypes)) {
        setError(
          `Cannot assign parent: The location type "${draggedLocation.locationType?.name || 'Unknown'}" cannot be a child of "${targetLocation.locationType?.name || 'Unknown'}"`
        )
        // Invalid type - reset position only after showing error
        loadLocations()
        return
      }

      // Prevent circular references - only prevent making a location a child of its own descendants
      // (Allow moving to ancestors - parent, grandparent, etc.)
      const wouldCreateCycle = (() => {
        // Check if target is a descendant of dragged location (would create a cycle)
        // We need to check if targetLocation is anywhere in the subtree of draggedLocation
        const checkIfDescendant = (parentId, childId, visited = new Set()) => {
          if (visited.has(String(parentId))) return false // Prevent infinite loops
          visited.add(String(parentId))
          
          if (String(parentId) === String(childId)) return true
          
          // Find all children of parentId
          const children = locations.filter(
            (loc) => loc && loc.parent_id && String(loc.parent_id) === String(parentId)
          )
          
          // Recursively check if any child is the target or has the target as a descendant
          for (const child of children) {
            if (String(child.id) === String(childId)) return true
            if (checkIfDescendant(child.id, childId, visited)) return true
          }
          
          return false
        }
        
        return checkIfDescendant(draggedLocationId, targetLocationId)
      })()

      if (wouldCreateCycle) {
        setError('Cannot assign parent: This would create a circular reference (cannot make a location a child of its own descendant)')
        // Would create cycle - reset position only after showing error
        loadLocations()
        return
      }

      // Store viewport before update to preserve camera position
      let savedViewport = null
      if (reactFlowInstance.current) {
        savedViewport = reactFlowInstance.current.getViewport()
        shouldPreserveViewport.current = true
        window.__locationBuilderViewport = savedViewport
      }

      // Update the location's parent_id
      try {
        setLoading(true)
        setError(null)
        await updateLocation(draggedLocationId, { parent_id: targetLocationId })
        // Reload locations to update the hierarchy and edges
        await loadLocations()
        // Ensure viewport is preserved after reload
        if (reactFlowInstance.current && savedViewport) {
          // Small delay to ensure nodes are rendered
          setTimeout(() => {
            if (reactFlowInstance.current) {
              reactFlowInstance.current.setViewport(savedViewport, { duration: 0 })
            }
          }, 50)
        }
      } catch (err) {
        console.error('Failed to update location parent:', err)
        setError(err.message || 'Failed to update location parent')
        // Reload to reset positions on error
        await loadLocations()
        // Restore viewport even on error
        if (reactFlowInstance.current && savedViewport) {
          setTimeout(() => {
            if (reactFlowInstance.current) {
              reactFlowInstance.current.setViewport(savedViewport, { duration: 0 })
            }
          }, 50)
        }
      } finally {
        setLoading(false)
      }
    },
    [nodes, locations, locationTypes, canCreateLocations, loadLocations]
  )

  const handleQuickFormSuccess = useCallback(
    (newLocation) => {
      // Store the parent ID before resetting it, so we can move camera to it after creation
      const parentId = quickFormParentId
      setShowQuickForm(false)
      setQuickFormParentId(null)
      setAllowedLocationTypes(null)
      
      // Store parent ID to focus on after locations reload
      if (parentId) {
        parentToFocusAfterCreation.current = String(parentId)
      }
      
      // Reload locations to include the new one
      loadLocations()
    },
    [loadLocations, quickFormParentId]
  )

  const handleAddOrphan = () => {
    setQuickFormParentId(null)
    setAllowedLocationTypes(null) // No restrictions for orphan locations
    setShowQuickForm(true)
  }

  const handleConnectToParent = useCallback(
    async (parentId) => {
      if (!orphanToConnect || !parentId) return

      try {
        setLoading(true)
        await updateLocation(orphanToConnect, { parent_id: parentId })
        setShowParentSelector(false)
        setOrphanToConnect(null)
        loadLocations()
      } catch (err) {
        console.error('Failed to connect location to parent:', err)
        setError(err.message || 'Failed to connect location to parent')
      } finally {
        setLoading(false)
      }
    },
    [orphanToConnect, loadLocations]
  )

  if (!activeWorldId) {
    return (
      <section className="entities-page">
        <div className="entities-header">
          <div className="entities-header-top">
            <div className="entities-header-left">
              <h1>Location Builder</h1>
              <p className="entities-subtitle">
                Select a campaign or world you own to choose a world context.
              </p>
            </div>
          </div>
        </div>
      </section>
    )
  }

  const locationSubtitle = selectedCampaign
    ? `${selectedCampaign.name}${activeWorld?.name ? ` · ${activeWorld.name}` : ''}`
    : activeWorld?.name
      ? `World · ${activeWorld.name}`
      : ''

  return (
    <section className="entities-page">
      <div className="entities-header">
        <div className="entities-header-top">
          <div className="entities-header-left">
            <h1>Location Builder</h1>
            {locationSubtitle && <p className="entities-subtitle">{locationSubtitle}</p>}
          </div>
          <div className="entities-header-right">
            {focusedLocationId && (
              <button className="btn btn-secondary" onClick={handleShowAll} disabled={loading}>
                Show All
              </button>
            )}
            {canCreateLocations && (
              <button className="btn submit" onClick={handleAddOrphan} disabled={loading}>
                <Plus size={18} /> Add Location
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '1rem',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ position: 'relative', width: '280px', maxWidth: '280px' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#64748b',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            placeholder="Search locations..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setShowSearchDropdown(e.target.value.trim().length > 0)
            }}
            onFocus={() => {
              if (searchQuery.trim().length > 0) {
                setShowSearchDropdown(true)
              }
            }}
            onBlur={() => {
              // Delay hiding dropdown to allow click events
              setTimeout(() => setShowSearchDropdown(false), 200)
            }}
            style={{
              width: '100%',
              padding: '0.4rem 0.6rem 0.4rem 2.25rem',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              fontSize: '0.875rem',
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('')
                setShowSearchDropdown(false)
              }}
              style={{
                position: 'absolute',
                right: '6px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                color: '#64748b',
              }}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
          {/* Search Dropdown */}
          {showSearchDropdown && searchResults.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: '4px',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)',
                maxHeight: '300px',
                overflowY: 'auto',
                zIndex: 1000,
              }}
            >
              {searchResults.map((location) => (
                <button
                  key={location.id}
                  type="button"
                  onClick={() => handleSearchLocationClick(location.id)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    borderBottom: '1px solid #f1f5f9',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    color: '#1e293b',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8fafc'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                    {location.name}
                  </div>
                  {location.locationType?.name && (
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {location.locationType.name}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

      </div>

      {error && (
        <div className="alert error" role="alert" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* React Flow Canvas */}
      <div style={{ width: '100%', height: 'calc(100vh - 300px)', minHeight: '500px' }}>
        {loading ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
            }}
          >
            <p>Loading locations...</p>
          </div>
        ) : nodes.length === 0 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <p>No locations found.</p>
            {canCreateLocations && (
              <button className="btn submit" onClick={handleAddOrphan}>
                <Plus size={18} /> Create First Location
              </button>
            )}
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeDragStart={handleNodeDragStart}
            onNodeDrag={handleNodeDrag}
            onNodeDragStop={handleNodeDragStop}
            onNodeDoubleClick={handleNodeDoubleClick}
            onInit={(instance) => {
              reactFlowInstance.current = instance
            }}
            nodeTypes={nodeTypes}
            nodesDraggable={true}
            nodesConnectable={false}
            elementsSelectable={true}
            panOnDrag={true} // Allow panning with left mouse button when not dragging nodes
            zoomOnScroll={true}
            zoomOnPinch={true}
            fitView={false}
            fitViewOptions={{ padding: 0.2 }}
            defaultEdgeOptions={{
              style: { stroke: '#64748b', strokeWidth: 2 },
              type: 'smoothstep',
            }}
          >
            <Background />
            <Controls />
            <MiniMap style={{ position: 'absolute', top: 10, right: 10, bottom: 'auto', left: 'auto' }} />
            <style>{`
              .react-flow__minimap {
                position: absolute !important;
                top: 10px !important;
                right: 10px !important;
                bottom: auto !important;
                left: auto !important;
              }
            `}</style>
          </ReactFlow>
        )}
      </div>

      {/* Quick Add Form Modal */}
      {showQuickForm && (
        <div className="side-panel-overlay" role="dialog" aria-modal="true">
          <div className="side-panel">
            <QuickLocationForm
              parentId={quickFormParentId}
              locationTypes={allowedLocationTypes || locationTypes}
              onClose={() => {
                setShowQuickForm(false)
                setQuickFormParentId(null)
                setAllowedLocationTypes(null)
              }}
              onSuccess={handleQuickFormSuccess}
            />
          </div>
        </div>
      )}

      {/* Parent Selector Modal for Orphan Connection */}
      {showParentSelector && (
        <div className="side-panel-overlay" role="dialog" aria-modal="true">
          <div className="side-panel">
            <div className="side-panel-header">
              <h2>Set Parent Location</h2>
              <button
                type="button"
                className="icon-btn"
                onClick={() => {
                  setShowParentSelector(false)
                  setOrphanToConnect(null)
                }}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="side-panel-content">
              <p style={{ marginBottom: '1rem' }}>
                Select a parent location for this orphan location:
              </p>
              <div
                style={{
                  maxHeight: '400px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                {filteredLocations
                  .filter((loc) => {
                    // Exclude the orphan itself and its descendants
                    const locId = String(loc.id)
                    const orphanId = String(orphanToConnect)
                    if (locId === orphanId) return false
                    // Could add more sophisticated checks here for descendants
                    return true
                  })
                  .map((loc) => (
                    <button
                      key={loc.id}
                      type="button"
                      className="btn btn-secondary"
                      style={{ textAlign: 'left', justifyContent: 'flex-start' }}
                      onClick={() => handleConnectToParent(loc.id)}
                      disabled={loading}
                    >
                      {loc.name}
                      {loc.locationType?.name && (
                        <span style={{ marginLeft: '0.5rem', opacity: 0.7 }}>
                          ({loc.locationType.name})
                        </span>
                      )}
                    </button>
                  ))}
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handleConnectToParent(null)}
                  disabled={loading}
                  style={{ marginTop: '1rem' }}
                >
                  Remove Parent (Make Root)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Location Info Drawer */}
      {infoDrawerLocationId && (
        <LocationInfoDrawer
          locationId={infoDrawerLocationId}
          location={infoDrawerLocation}
          isLoading={infoDrawerLoading}
          error={infoDrawerError}
          fallbackName={
            infoDrawerLocation?.name ||
            locations.find((loc) => String(loc.id) === String(infoDrawerLocationId))?.name ||
            'Location'
          }
          locationFields={infoDrawerFields}
          onClose={() => setInfoDrawerLocationId(null)}
        />
      )}
    </section>
  )
}

