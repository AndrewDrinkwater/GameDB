import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  MarkerType,
  useNodesState,
  useEdgesState,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { getEntityGraph } from '../../api/entities'
import { Filter, Info } from 'lucide-react'
import EntityInfoPreview from '../../components/entities/EntityInfoPreview.jsx'
import { nodeTypes, edgeTypes } from '../../components/graphTypes'
import '../../components/graphStyles.css'

const HORIZONTAL_SPACING = 240
const VERTICAL_SPACING = 220
const MAX_DEPTH = 3

const CONTEXT_MENU_INITIAL_STATE = {
  visible: false,
  x: 0,
  y: 0,
  node: null,
}

const buildLayout = (graphData, rootId) => {
  if (!graphData || !Array.isArray(graphData.nodes)) {
    return { nodes: [], edges: [] }
  }

  const rootKey = String(rootId)
  const nodesMap = new Map()
  graphData.nodes.forEach((node) => {
    if (!node || !node.id) return
    const id = String(node.id)
    nodesMap.set(id, {
      ...node,
      id,
    })
  })

  if (!nodesMap.has(rootKey) && graphData.root) {
    const rootNode = graphData.root
    nodesMap.set(rootKey, {
      ...rootNode,
      id: rootKey,
    })
  }

  if (!nodesMap.has(rootKey)) {
    return {
      nodes: Array.from(nodesMap.values()),
      edges: graphData.edges || [],
    }
  }

  const adjacency = new Map()
  ;(graphData.edges || []).forEach((edge) => {
    if (!edge) return
    const sourceId = String(edge.source)
    const targetId = String(edge.target)
    if (!adjacency.has(sourceId)) adjacency.set(sourceId, [])
    if (!adjacency.has(targetId)) adjacency.set(targetId, [])
    adjacency.get(sourceId).push({ id: targetId, direction: 'out' })
    adjacency.get(targetId).push({ id: sourceId, direction: 'in' })
  })

  const visited = new Set([rootKey])
  const nodeMeta = new Map([
    [rootKey, { depth: 0, orientation: 'center', firstDirection: null }],
  ])
  const queue = [rootKey]

  while (queue.length) {
    const currentId = queue.shift()
    const currentMeta = nodeMeta.get(currentId)
    const neighbors = adjacency.get(currentId) || []

    neighbors.forEach(({ id: neighborId, direction }) => {
      if (visited.has(neighborId)) return
      visited.add(neighborId)

      const nextDepth = (currentMeta?.depth ?? 0) + 1
      const nextFirstDirection =
        currentMeta?.firstDirection ?? (direction === 'in' ? 'top' : 'bottom')
      const orientation = nextFirstDirection ?? 'center'

      nodeMeta.set(neighborId, {
        depth: nextDepth,
        orientation,
        firstDirection: nextFirstDirection,
      })
      queue.push(neighborId)
    })
  }

  const groupedByRow = new Map()
  nodeMeta.forEach((meta, id) => {
    if (id === rootKey) return
    if (!meta || !meta.orientation || meta.orientation === 'center') return
    const key = `${meta.orientation}-${meta.depth}`
    if (!groupedByRow.has(key)) {
      groupedByRow.set(key, [])
    }
    groupedByRow.get(key).push(id)
  })

  const positions = new Map()
  positions.set(rootKey, { x: 0, y: 0 })

  groupedByRow.forEach((ids, key) => {
    const [orientation, depthStr] = key.split('-')
    const depth = Number.parseInt(depthStr, 10) || 1
    const yOffset =
      orientation === 'top'
        ? -depth * VERTICAL_SPACING
        : depth * VERTICAL_SPACING

    ids.sort((a, b) => {
      const nodeA = nodesMap.get(a)
      const nodeB = nodesMap.get(b)
      return (nodeA?.name || '').localeCompare(nodeB?.name || '')
    })

    const startX = -((ids.length - 1) * HORIZONTAL_SPACING) / 2
    ids.forEach((id, index) => {
      positions.set(id, {
        x: startX + index * HORIZONTAL_SPACING,
        y: yOffset,
      })
    })
  })

  // Position any nodes not yet placed (fallback layout)
  let unplacedIndex = 0
  nodesMap.forEach((node, id) => {
    if (positions.has(id)) return
    positions.set(id, {
      x: (unplacedIndex - 0.5) * HORIZONTAL_SPACING,
      y: VERTICAL_SPACING * 2,
    })
    unplacedIndex += 1
  })

  const laidOutNodes = Array.from(nodesMap.values()).map((node) => {
    const meta = nodeMeta.get(node.id)
    return {
      id: node.id,
      data: {
        label: node.name,
        type: node.type,
        isRoot: node.id === rootKey,
        depth: meta?.depth ?? (node.id === rootKey ? 0 : null),
        orientation: meta?.orientation ?? 'center',
      },
      position: positions.get(node.id) || { x: 0, y: 0 },
      type: 'customNode',
    }
  })

  const laidOutEdges = (graphData.edges || []).map((edge) => {
    const relationshipType = edge.relationshipType || {}
    const sourceId = String(edge.source)
    const targetId = String(edge.target)

    const rootIsSource = sourceId === rootKey
    const rootIsTarget = targetId === rootKey
    let label = edge.label

    if (relationshipType) {
      if (rootIsSource) {
        label =
          relationshipType.fromName ||
          relationshipType.name ||
          edge.label
      } else if (rootIsTarget) {
        label =
          relationshipType.toName || relationshipType.name || edge.label
      } else {
        label = relationshipType.name || edge.label
      }
    }

    return {
      id: String(edge.id || `${sourceId}-${targetId}`),
      source: sourceId,
      target: targetId,
      label,
      data: {
        relationshipTypeId: edge.relationshipTypeId || edge.type || null,
        relationshipTypeName:
          relationshipType.name || label || null,
        relationshipType: relationshipType || null,
      },
      animated: false,
      type: 'customEdge',
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#38bdf8',
        width: 18,
        height: 18,
      },
    }
  })

  return {
    nodes: laidOutNodes,
    edges: laidOutEdges,
  }
}

const applyLayerFilters = (nodes, edges, { layerMode, depthLimit, rootId }) => {
  if (!Array.isArray(nodes) || nodes.length === 0) {
    return { nodes: [], edges: [] }
  }

  const nodeMap = new Map(nodes.map((node) => [String(node.id), node]))
  const safeDepth = Math.min(Math.max(depthLimit ?? 1, 1), MAX_DEPTH)
  const getDepth = (id) => {
    if (id === rootId) return 0
    const node = nodeMap.get(String(id))
    return node?.data?.depth ?? Infinity
  }

  let filteredEdges = edges || []

  if (layerMode === 'direct') {
    filteredEdges = filteredEdges.filter(
      (edge) => edge.source === rootId || edge.target === rootId,
    )
  } else if (layerMode === 'board') {
    filteredEdges = filteredEdges.filter((edge) => {
      const sourceDepth = getDepth(edge.source)
      const targetDepth = getDepth(edge.target)
      return sourceDepth <= 1 && targetDepth <= 1
    })
  } else {
    filteredEdges = filteredEdges.filter((edge) => {
      const sourceDepth = getDepth(edge.source)
      const targetDepth = getDepth(edge.target)
      return sourceDepth <= safeDepth && targetDepth <= safeDepth
    })
  }

  const allowedNodeIds = new Set([rootId])
  filteredEdges.forEach((edge) => {
    allowedNodeIds.add(String(edge.source))
    allowedNodeIds.add(String(edge.target))
  })

  const filteredNodes = nodes.filter((node) => allowedNodeIds.has(String(node.id)))

  return {
    nodes: filteredNodes,
    edges: filteredEdges,
  }
}

export default function EntityExplorer() {
  const { worldId, entityId } = useParams()
  const navigate = useNavigate()
  const rootId = String(entityId)

  const [filters, setFilters] = useState({
    relationshipTypes: [],
    depth: 1,
    layerMode: 'direct',
  })
  const [rawNodes, setRawNodes] = useState([])
  const [rawEdges, setRawEdges] = useState([])
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [selectedEntity, setSelectedEntity] = useState(null)
  const [loading, setLoading] = useState(true)
  const [rootPosition, setRootPosition] = useState(null)
  const [shouldAutoFit, setShouldAutoFit] = useState(false)
  const [reactFlowInstance, setReactFlowInstance] = useState(null)
  const [contextMenu, setContextMenu] = useState(CONTEXT_MENU_INITIAL_STATE)
  const [availableRelationshipTypes, setAvailableRelationshipTypes] = useState([])

  const depth = filters.depth
  const relationshipTypes = filters.relationshipTypes
  const layerMode = filters.layerMode

  useEffect(() => {
    let cancelled = false

    async function loadGraph() {
      setLoading(true)
      try {
        const data = await getEntityGraph(worldId, entityId, {
          depth,
          relationshipTypes,
        })
        if (cancelled) return

        const { nodes: laidOutNodes, edges: laidOutEdges } = buildLayout(
          data,
          entityId,
        )

        setRawNodes(laidOutNodes)
        setRawEdges(laidOutEdges)
        setSelectedEntity(rootId)
        setContextMenu(CONTEXT_MENU_INITIAL_STATE)

        const initialRoot = laidOutNodes.find((node) => node.id === rootId)
        if (initialRoot) {
          setRootPosition(initialRoot.position)
        }

        const relationshipTypeMap = new Map()
        if (Array.isArray(data.relationshipTypes)) {
          data.relationshipTypes.forEach((type) => {
            if (!type || type.id === undefined || type.id === null) return
            const id = String(type.id)
            relationshipTypeMap.set(id, {
              id,
              name: type.name || `Relationship ${id}`,
              fromName: type.fromName || null,
              toName: type.toName || null,
            })
          })
        }

        if (relationshipTypeMap.size === 0 && Array.isArray(laidOutEdges)) {
          laidOutEdges.forEach((edge) => {
            const typeId = edge.data?.relationshipTypeId || edge.type
            if (!typeId) return
            const id = String(typeId)
            if (relationshipTypeMap.has(id)) return
            const relationshipType = edge.data?.relationshipType || edge.relationshipType || {}
            relationshipTypeMap.set(id, {
              id,
              name:
                relationshipType.name ||
                edge.data?.relationshipTypeName ||
                edge.label ||
                `Relationship ${id}`,
              fromName: relationshipType.fromName || null,
              toName: relationshipType.toName || null,
            })
          })
        }

        if (relationshipTypeMap.size > 0) {
          setAvailableRelationshipTypes((prev) => {
            const merged = new Map(prev.map((type) => [String(type.id), type]))
            relationshipTypeMap.forEach((value, key) => {
              const existing = merged.get(key) || {}
              merged.set(key, {
                id: key,
                name: value.name || existing.name || `Relationship ${key}`,
                fromName: value.fromName ?? existing.fromName ?? null,
                toName: value.toName ?? existing.toName ?? null,
              })
            })
            return Array.from(merged.values()).sort((a, b) =>
              (a.name || '').localeCompare(b.name || ''),
            )
          })
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error loading graph', err)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadGraph()

    return () => {
      cancelled = true
    }
  }, [worldId, entityId, depth, relationshipTypes, rootId])

  const filteredGraph = useMemo(
    () =>
      applyLayerFilters(rawNodes, rawEdges, {
        layerMode,
        depthLimit: depth,
        rootId,
      }),
    [rawNodes, rawEdges, layerMode, depth, rootId],
  )

  useEffect(() => {
    setNodes(filteredGraph.nodes)
    setEdges(filteredGraph.edges)
    if (filteredGraph.nodes.length) {
      setShouldAutoFit(true)
    }
  }, [filteredGraph, setEdges, setNodes])

  useEffect(() => {
    if (!filteredGraph.nodes.length) {
      setSelectedEntity(null)
      return
    }

    if (!filteredGraph.nodes.some((node) => node.id === selectedEntity)) {
      const fallbackNode =
        filteredGraph.nodes.find((node) => node.id === rootId) ||
        filteredGraph.nodes[0]
      setSelectedEntity(fallbackNode?.id || null)
    }
  }, [filteredGraph.nodes, selectedEntity, rootId])

  useEffect(() => {
    if (!reactFlowInstance) return
    if (!shouldAutoFit) return
    if (!nodes.length) return

    const timeout = setTimeout(() => {
      reactFlowInstance.fitView({ padding: 0.2, duration: 400 })
      setShouldAutoFit(false)
    }, 0)

    return () => clearTimeout(timeout)
  }, [reactFlowInstance, shouldAutoFit, nodes])

  useEffect(() => {
    if (!rawNodes.length) return

    const rootNode = rawNodes.find((node) => node.id === rootId)
    if (!rootNode) return

    setRootPosition((prev) => {
      if (prev && prev.x === rootNode.position.x && prev.y === rootNode.position.y) {
        return prev
      }
      return rootNode.position
    })
  }, [rawNodes, rootId])

  useEffect(() => {
    if (!contextMenu.visible) return
    const handleGlobalClick = () => setContextMenu(CONTEXT_MENU_INITIAL_STATE)
    window.addEventListener('click', handleGlobalClick)
    return () => {
      window.removeEventListener('click', handleGlobalClick)
    }
  }, [contextMenu.visible])

  const onNodeClick = useCallback((_, node) => {
    setSelectedEntity(node.id)
    setContextMenu(CONTEXT_MENU_INITIAL_STATE)
  }, [])

  const onNodeContextMenu = useCallback((event, node) => {
    event.preventDefault()
    event.stopPropagation()
    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      node,
    })
  }, [])

  const handleDepthChange = (event) => {
    const value = Number.parseInt(event.target.value, 10)
    const safeValue = Math.min(Math.max(Number.isNaN(value) ? 1 : value, 1), MAX_DEPTH)
    setFilters((prev) => ({ ...prev, depth: safeValue }))
  }

  const toggleRelationshipType = (typeId) => {
    setFilters((prev) => {
      const id = String(typeId)
      const exists = prev.relationshipTypes.includes(id)
      return {
        ...prev,
        relationshipTypes: exists
          ? prev.relationshipTypes.filter((value) => value !== id)
          : [...prev.relationshipTypes, id],
      }
    })
  }

  const handleLayerModeChange = (event) => {
    const value = event.target.value
    setFilters((prev) => ({ ...prev, layerMode: value }))
  }

  const focusDisabled = !contextMenu.node || String(contextMenu.node.id) === rootId

  const handleFocusEntity = () => {
    if (!contextMenu.node) return
    const targetId = String(contextMenu.node.id)
    setContextMenu(CONTEXT_MENU_INITIAL_STATE)
    if (targetId === rootId) return
    navigate(`/worlds/${worldId}/entities/${targetId}/explore`)
  }

  const handleOpenRecord = () => {
    if (!contextMenu.node) return
    const targetId = String(contextMenu.node.id)
    setContextMenu(CONTEXT_MENU_INITIAL_STATE)
    const url = `/entities/${targetId}`
    window.open(url, '_blank', 'noopener')
  }

  return (
    <div className="flex h-full w-full">
      {/* Left filter panel */}
      <div className="w-72 bg-gray-900 text-gray-100 border-r border-gray-700 p-4 flex flex-col gap-4">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-200">
          <Filter size={16} /> Filters
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[0.65rem] uppercase tracking-wide text-gray-400">
            Relationship Depth (1-3)
          </label>
          <input
            type="number"
            min={1}
            max={3}
            value={depth}
            onChange={handleDepthChange}
            className="bg-gray-800 border border-gray-700 p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[0.65rem] uppercase tracking-wide text-gray-400">
            Relationship Layers
          </span>
          <div className="flex flex-col gap-2 text-sm">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="radio"
                name="layerMode"
                value="direct"
                checked={layerMode === 'direct'}
                onChange={handleLayerModeChange}
                className="mt-1"
              />
              <span>
                Direct relationships only
                <span className="block text-xs text-gray-500">
                  Show links connected directly to the focused entity.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="radio"
                name="layerMode"
                value="board"
                checked={layerMode === 'board'}
                onChange={handleLayerModeChange}
                className="mt-1"
              />
              <span>
                Include on-board relationships
                <span className="block text-xs text-gray-500">
                  Reveal links between entities already shown on the board.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="radio"
                name="layerMode"
                value="extended"
                checked={layerMode === 'extended'}
                onChange={handleLayerModeChange}
                className="mt-1"
              />
              <span>
                Extended relationships
                <span className="block text-xs text-gray-500">
                  Explore additional layers up to the selected depth.
                </span>
              </span>
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[0.65rem] uppercase tracking-wide text-gray-400">
            Relationship Types
          </span>
          {availableRelationshipTypes.length ? (
            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1 text-sm">
              {availableRelationshipTypes.map((type) => {
                const id = String(type.id)
                const isChecked = relationshipTypes.includes(id)
                return (
                  <label key={id} className="flex flex-col gap-1 cursor-pointer">
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleRelationshipType(id)}
                        className="mt-1"
                      />
                      <span>
                        {type.name}
                        {(type.fromName || type.toName) && (
                          <span className="block text-xs text-gray-500">
                            {type.fromName || 'Source'} → {type.toName || 'Target'}
                          </span>
                        )}
                      </span>
                    </div>
                  </label>
                )
              })}
            </div>
          ) : (
            <p className="text-xs text-gray-500">No relationship types loaded yet.</p>
          )}
          {relationshipTypes.length > 0 ? (
            <button
              type="button"
              onClick={() => setFilters((prev) => ({ ...prev, relationshipTypes: [] }))}
              className="self-start text-xs text-sky-400 hover:text-sky-300"
            >
              Show all relationship types
            </button>
          ) : null}
        </div>
      </div>

      {/* Main graph area */}
      <div className="flex-1 relative bg-gray-950" style={{ height: '100vh' }}>
        {loading ? (
          <div className="text-gray-400 text-sm p-4">Loading graph...</div>
        ) : (
          <ReactFlow
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            onNodeContextMenu={onNodeContextMenu}
            onPaneClick={() => setContextMenu(CONTEXT_MENU_INITIAL_STATE)}
            onPaneContextMenu={() => setContextMenu(CONTEXT_MENU_INITIAL_STATE)}
            onInit={setReactFlowInstance}
            style={{ width: '100%', height: '100%' }}
          >
            <div className="graph-toolbar">
              <button
                type="button"
                onClick={() => {
                  if (!reactFlowInstance || !rootPosition) return
                  reactFlowInstance.setCenter(rootPosition.x, rootPosition.y, {
                    zoom: 1.8,
                    duration: 400,
                  })
                }}
              >
                Refocus Target
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!reactFlowInstance) return
                  reactFlowInstance.fitView({ padding: 0.2, duration: 400 })
                }}
              >
                Zoom to Fit
              </button>
            </div>
            <MiniMap />
            <Controls />
            <Background color="#222" gap={16} />
          </ReactFlow>
        )}

        {contextMenu.visible && contextMenu.node ? (
          <div
            className="graph-context-menu"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <button
              type="button"
              onClick={handleFocusEntity}
              disabled={focusDisabled}
            >
              Focus on this entity
            </button>
            <button type="button" onClick={handleOpenRecord}>
              Open entity record
            </button>
          </div>
        ) : null}
      </div>

      {/* Entity detail drawer */}
      <div className="w-80 bg-gray-900 text-gray-100 border-l border-gray-700">
        {selectedEntity ? (
          <EntityInfoPreview
            entityId={selectedEntity}
            onClose={() => setSelectedEntity(null)}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            <Info size={14} className="mr-2" /> Select a node to view details
          </div>
        )}
      </div>
    </div>
  )
}
