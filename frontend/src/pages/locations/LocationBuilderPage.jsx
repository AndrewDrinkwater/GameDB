import { useCallback, useEffect, useMemo, useState } from 'react'
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
  const [selectedTypeId, setSelectedTypeId] = useState(null)
  const [showQuickForm, setShowQuickForm] = useState(false)
  const [quickFormParentId, setQuickFormParentId] = useState(null)
  const [selectedLocationId, setSelectedLocationId] = useState(null)
  const [showParentSelector, setShowParentSelector] = useState(false)
  const [orphanToConnect, setOrphanToConnect] = useState(null)


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

  // Filter locations based on search and type
  const filteredLocations = useMemo(() => {
    let filtered = locations

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(
        (loc) =>
          loc.name?.toLowerCase().includes(query) ||
          loc.description?.toLowerCase().includes(query) ||
          loc.locationType?.name?.toLowerCase().includes(query)
      )
    }

    if (selectedTypeId) {
      filtered = filtered.filter(
        (loc) => String(loc.location_type_id) === String(selectedTypeId)
      )
    }

    return filtered
  }, [locations, searchQuery, selectedTypeId])

  // Build graph nodes and edges from filtered locations
  useEffect(() => {
    if (!filteredLocations.length) {
      setNodes([])
      setEdges([])
      return
    }

    try {
      // Find root location (first root location or selected one)
      const rootLocation = selectedLocationId
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

      // Add event handlers to nodes and ensure all required properties
      const nodesWithHandlers = layoutedNodes
        .filter((node) => {
          // Strict validation - ensure node exists and has required properties
          if (!node || !node.id) return false
          return true
        })
        .map((node) => {
          // Ensure position is valid
          const position = node.position || { x: 0, y: 0 }
          const x = typeof position.x === 'number' && Number.isFinite(position.x) ? position.x : 0
          const y = typeof position.y === 'number' && Number.isFinite(position.y) ? position.y : 0

          return {
            id: String(node.id),
            type: node.type || 'location',
            width: 120,
            height: 120,
            position: { x, y },
            data: {
              label: node.data?.label || String(node.id),
              typeName: node.data?.typeName || 'Location',
              locationId: String(node.id),
              parentId: node.data?.parentId || node.parentId || null,
              childCount: node.data?.childCount || 0,
              description: node.data?.description || '',
              locationTypeId: node.data?.locationTypeId || null,
              onAddChild: canCreateLocations
                ? (parentId) => {
                    setQuickFormParentId(parentId)
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
                navigate(`/locations/${locationId}`)
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
  }, [filteredLocations, selectedLocationId, canCreateLocations, navigate])

  const onNodesChange = useCallback((changes) => {
    setNodes((nds) => applyNodeChanges(changes, nds))
  }, [])

  const onEdgesChange = useCallback((changes) => {
    setEdges((eds) => applyEdgeChanges(changes, eds))
  }, [])

  const handleQuickFormSuccess = useCallback(
    (newLocation) => {
      setShowQuickForm(false)
      setQuickFormParentId(null)
      // Reload locations to include the new one
      loadLocations()
    },
    [loadLocations]
  )

  const handleAddOrphan = () => {
    setQuickFormParentId(null)
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
        <div style={{ position: 'relative', flex: '1 1 300px', minWidth: '200px' }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '12px',
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
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem 0.5rem 2.5rem',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              fontSize: '0.95rem',
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '8px',
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
              <X size={16} />
            </button>
          )}
        </div>

        <select
          value={selectedTypeId || ''}
          onChange={(e) => setSelectedTypeId(e.target.value || null)}
          style={{
            padding: '0.5rem 0.75rem',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            fontSize: '0.95rem',
            minWidth: '200px',
          }}
        >
          <option value="">All Types</option>
          {locationTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>

        {selectedTypeId && (
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={() => setSelectedTypeId(null)}
          >
            <X size={14} /> Clear Filter
          </button>
        )}
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
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            defaultEdgeOptions={{
              style: { stroke: '#64748b', strokeWidth: 2 },
              type: 'smoothstep',
            }}
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        )}
      </div>

      {/* Quick Add Form Modal */}
      {showQuickForm && (
        <div className="side-panel-overlay" role="dialog" aria-modal="true">
          <div className="side-panel">
            <QuickLocationForm
              parentId={quickFormParentId}
              locationTypes={locationTypes}
              onClose={() => {
                setShowQuickForm(false)
                setQuickFormParentId(null)
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
    </section>
  )
}

