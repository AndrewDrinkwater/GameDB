import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { Filter, Info, Search } from 'lucide-react'
import EntityInfoPreview from '../../components/entities/EntityInfoPreview.jsx'
import { nodeTypes, edgeTypes } from '../../components/graphTypes'
import '../../components/graphStyles.css'

const HORIZONTAL_SPACING = 240
const VERTICAL_SPACING = 220
const MAX_DEPTH = 3

const RELATIONSHIP_COLOR_PALETTE = [
  '#38bdf8',
  '#a855f7',
  '#f97316',
  '#22d3ee',
  '#f43f5e',
  '#84cc16',
  '#facc15',
  '#14b8a6',
  '#c084fc',
  '#fb7185',
]

const RELATIONSHIP_LABEL_BACKGROUND = '#0b1220'

const hashStringToIndex = (value) => {
  if (!value) return 0
  const str = String(value)
  let hash = 0
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

const getRelationshipStyle = (typeId) => {
  const paletteIndex =
    RELATIONSHIP_COLOR_PALETTE[hashStringToIndex(typeId) % RELATIONSHIP_COLOR_PALETTE.length]

  const patternIndex = hashStringToIndex(`${typeId}-pattern`) % 3
  const strokeDasharray = patternIndex === 0 ? undefined : patternIndex === 1 ? '6 6' : '2 4'

  return {
    color: paletteIndex,
    strokeDasharray,
    labelBackground: RELATIONSHIP_LABEL_BACKGROUND,
    labelColor: '#e0f2fe',
  }
}

const buildRelationshipLabel = ({
  edge,
  relationshipType,
  rootKey,
  sourceNode,
  targetNode,
}) => {
  const baseName = relationshipType?.name?.trim() || ''
  const fromName = relationshipType?.fromName?.trim() || ''
  const toName = relationshipType?.toName?.trim() || ''

  const sourceName = sourceNode?.name || sourceNode?.data?.label || 'Source'
  const targetName = targetNode?.name || targetNode?.data?.label || 'Target'

  let directionLabel = ''

  if (edge.source === rootKey && fromName) {
    directionLabel = fromName
  } else if (edge.target === rootKey && toName) {
    directionLabel = toName
  } else if (fromName) {
    directionLabel = fromName
  } else if (toName) {
    directionLabel = toName
  } else if (baseName) {
    directionLabel = baseName
  } else if (edge.label) {
    directionLabel = edge.label
  } else {
    directionLabel = 'Relationship'
  }

  const tooltipParts = []
  if (baseName) {
    tooltipParts.push(baseName)
  }
  tooltipParts.push(`${sourceName} → ${targetName}`)

  return {
    label: directionLabel,
    tooltip: tooltipParts.filter(Boolean).join('\n'),
  }
}

const dedupeRelationshipSummaries = (relationships) => {
  if (!Array.isArray(relationships)) return []

  const seen = new Set()
  const result = []

  relationships.forEach((relationship) => {
    if (!relationship) return

    const rawId =
      relationship.relationshipId ??
      relationship.id ??
      relationship.edgeId ??
      relationship.data?.id ??
      null

    const typeKey = relationship.typeId ?? relationship.type ?? ''
    const labelKey = relationship.label ?? relationship.typeName ?? ''

    const key =
      rawId !== null && rawId !== undefined
        ? `id:${String(rawId)}`
        : `summary:${String(typeKey)}:${String(labelKey)}`

    if (seen.has(key)) return
    seen.add(key)
    result.push(relationship)
  })

  return result
}

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

  const edgesByPair = new Map()
  const relationshipIdsByPair = new Map()
  ;(graphData.edges || []).forEach((edge) => {
    if (!edge) return
    const sourceId = String(edge.source)
    const targetId = String(edge.target)
    const key = `${sourceId}->${targetId}`
    if (!edgesByPair.has(key)) {
      edgesByPair.set(key, [])
      relationshipIdsByPair.set(key, new Set())
    }
    const dedupeBase =
      edge.relationshipId ??
      edge.id ??
      edge.data?.id ??
      `${edge.source}-${edge.target}-${edge.type ?? ''}-${edge.label ?? ''}`

    const dedupeKey = String(dedupeBase)
    const seenForPair = relationshipIdsByPair.get(key)
    if (seenForPair.has(dedupeKey)) return

    seenForPair.add(dedupeKey)
    edgesByPair.get(key).push(edge)
  })

  const laidOutEdges = []

  edgesByPair.forEach((edgeList, pairKey) => {
    const [sourceId, targetId] = pairKey.split('->')
    const sourceNode = nodesMap.get(sourceId)
    const targetNode = nodesMap.get(targetId)

    const rawSummaries = edgeList.map((edge, index) => {
      const relationshipType = edge.relationshipType || {}
      const typeId =
        edge.relationshipTypeId || edge.type || relationshipType?.id || null
      const style = getRelationshipStyle(typeId || `${sourceId}-${targetId}`)

      const { label, tooltip } = buildRelationshipLabel({
        edge: {
          ...edge,
          source: sourceId,
          target: targetId,
        },
        relationshipType,
        rootKey,
        sourceNode,
        targetNode,
      })

      return {
        id: String(
          edge.id ?? `${sourceId}-${targetId}-${typeId ?? 'rel'}-${index}`,
        ),
        typeId:
          typeId === null || typeId === undefined ? null : String(typeId),
        typeName:
          relationshipType.name || edge.label || `Relationship ${index + 1}`,
        label,
        tooltip,
        style,
      }
    })

    const relationshipSummaries = dedupeRelationshipSummaries(rawSummaries)
    const multiCount = relationshipSummaries.length

    if (multiCount === 0) {
      return
    }

    const visibleTypeIds = Array.from(
      new Set(
        relationshipSummaries
          .map((summary) => summary.typeId)
          .filter((value) => value !== null && value !== undefined),
      ),
    ).map((value) => String(value))

    const primaryTypeId = visibleTypeIds[0] ?? null
    const baseStyle =
      relationshipSummaries[0]?.style ||
      getRelationshipStyle(primaryTypeId || `${sourceId}-${targetId}`)

    const aggregatedLabel =
      multiCount === 1
        ? relationshipSummaries[0]?.label || ''
        : String(multiCount)

    const aggregatedTooltip =
      multiCount === 1
        ? relationshipSummaries[0]?.tooltip || ''
        : relationshipSummaries
            .map(
              (summary) =>
                summary.tooltip || summary.label || summary.typeName || 'Relationship',
            )
            .join('\n')

    laidOutEdges.push({
      id:
        multiCount === 1
          ? relationshipSummaries[0]?.id || `${pairKey}-single`
          : `${pairKey}-group`,
      source: sourceId,
      target: targetId,
      label: aggregatedLabel,
      data: {
        relationshipTypeId: primaryTypeId,
        relationshipTypeIds: visibleTypeIds,
        relationshipTypeName:
          multiCount === 1
            ? relationshipSummaries[0]?.typeName || aggregatedLabel || null
            : `${multiCount} relationships`,
        relationshipType:
          multiCount === 1 ? edgeList[0]?.relationshipType || null : null,
        tooltip: aggregatedTooltip,
        multiIndex: multiCount > 1 ? (multiCount - 1) / 2 : 0,
        multiCount,
        style: baseStyle,
        sourceName: sourceNode?.name || sourceNode?.data?.label || '',
        targetName: targetNode?.name || targetNode?.data?.label || '',
        relationships: relationshipSummaries,
      },
      animated: false,
      type: 'customEdge',
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: baseStyle.color,
        width: 18,
        height: 18,
      },
    })
  })

  return {
    nodes: laidOutNodes,
    edges: laidOutEdges,
  }
}

const applyLayerFilters = (
  nodes,
  edges,
  { layerMode, depthLimit, rootId, hiddenRelationshipTypes = [] },
) => {
  if (!Array.isArray(nodes) || nodes.length === 0) {
    return { nodes: [], edges: [] }
  }

  const hiddenTypeSet = new Set(
    hiddenRelationshipTypes.map((value) => String(value)).filter(Boolean),
  )

  let filteredEdges = Array.isArray(edges) ? edges.slice() : []

  filteredEdges = filteredEdges
    .map((edge) => {
      if (!edge) return null

      const relationships = Array.isArray(edge.data?.relationships)
        ? dedupeRelationshipSummaries(edge.data.relationships)
        : null

      if (relationships) {
        const visibleRelationships = hiddenTypeSet.size
          ? relationships.filter((relationship) => {
              if (
                relationship?.typeId === null ||
                relationship?.typeId === undefined
              ) {
                return true
              }
              return !hiddenTypeSet.has(String(relationship.typeId))
            })
          : relationships.slice()

        if (visibleRelationships.length === 0) {
          return null
        }

        const nextMultiCount = visibleRelationships.length
        const nextLabel =
          nextMultiCount === 1
            ? visibleRelationships[0]?.label ||
              visibleRelationships[0]?.typeName ||
              edge.label
            : String(nextMultiCount)
        const nextTooltip =
          nextMultiCount === 1
            ? visibleRelationships[0]?.tooltip ||
              visibleRelationships[0]?.label ||
              visibleRelationships[0]?.typeName
            : visibleRelationships
                .map(
                  (relationship) =>
                    relationship?.tooltip ||
                    relationship?.label ||
                    relationship?.typeName ||
                    'Relationship',
                )
                .join('\n')

        const nextTypeIds = visibleRelationships
          .map((relationship) => relationship?.typeId)
          .filter((value) => value !== null && value !== undefined)
          .map((value) => String(value))
        const nextPrimaryTypeId = nextTypeIds[0] || null

        const nextRelationshipTypeName =
          nextMultiCount === 1
            ? visibleRelationships[0]?.typeName ||
              edge.data?.relationshipTypeName ||
              null
            : `${nextMultiCount} relationships`

        const nextStyle =
          nextMultiCount === 1
            ? visibleRelationships[0]?.style || edge.data?.style || {}
            : edge.data?.style || {}

        const nextMultiIndex =
          nextMultiCount > 1 ? (nextMultiCount - 1) / 2 : 0

        return {
          ...edge,
          label: nextLabel,
          data: {
            ...edge.data,
            tooltip: nextTooltip,
            multiCount: nextMultiCount,
            multiIndex: nextMultiIndex,
            relationshipTypeId: nextPrimaryTypeId,
            relationshipTypeIds: nextTypeIds,
            relationshipTypeName: nextRelationshipTypeName,
            relationships: visibleRelationships,
            style: nextStyle,
          },
          markerEnd: edge.markerEnd
            ? { ...edge.markerEnd, color: nextStyle.color || edge.markerEnd.color }
            : edge.markerEnd,
        }
      }

      const typeId =
        edge?.data?.relationshipTypeId ??
        edge?.relationshipTypeId ??
        edge?.type ??
        edge?.data?.relationshipType?.id ??
        null

      if (
        hiddenTypeSet.size > 0 &&
        typeId !== null &&
        typeId !== undefined &&
        hiddenTypeSet.has(String(typeId))
      ) {
        return null
      }

      return edge
    })
    .filter(Boolean)

  const nodeMap = new Map(nodes.map((node) => [String(node.id), node]))
  const safeDepth = Math.min(Math.max(depthLimit ?? 1, 1), MAX_DEPTH)
  const getDepth = (id) => {
    if (id === rootId) return 0
    const node = nodeMap.get(String(id))
    return node?.data?.depth ?? Infinity
  }

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

  const dedupedEdgesMap = new Map()
  filteredEdges.forEach((edge) => {
    if (!edge) return
    const key = String(edge.id ?? `${edge.source}-${edge.target}-${edge.label ?? ''}`)
    if (dedupedEdgesMap.has(key)) return
    dedupedEdgesMap.set(key, edge)
  })

  const uniqueEdges = Array.from(dedupedEdgesMap.values())

  const allowedNodeIds = new Set([String(rootId)])
  uniqueEdges.forEach((edge) => {
    allowedNodeIds.add(String(edge.source))
    allowedNodeIds.add(String(edge.target))
  })

  const seenNodeIds = new Set()
  const filteredNodes = []
  nodes.forEach((node) => {
    if (!node) return
    const id = String(node.id)
    if (!allowedNodeIds.has(id)) return
    if (seenNodeIds.has(id)) return
    seenNodeIds.add(id)
    filteredNodes.push(node)
  })

  return {
    nodes: filteredNodes,
    edges: uniqueEdges,
  }
}

export default function EntityExplorer() {
  const { worldId, entityId } = useParams()
  const navigate = useNavigate()
  const rootId = String(entityId)

  const [filters, setFilters] = useState({
    hiddenRelationshipTypes: [],
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
  const [hoveredEdgeId, setHoveredEdgeId] = useState(null)
  const [hoveredEdgeNodes, setHoveredEdgeNodes] = useState([])
  const [activeEdgeId, setActiveEdgeId] = useState(null)
  const [activeEdgeDetails, setActiveEdgeDetails] = useState(null)
  const [focusedNodeId, setFocusedNodeId] = useState(null)
  const [searchValue, setSearchValue] = useState('')
  const lastGraphIdentityRef = useRef({ worldId: null, entityId: null })

  const depth = filters.depth
  const hiddenRelationshipTypes = filters.hiddenRelationshipTypes
  const layerMode = filters.layerMode

  useEffect(() => {
    let cancelled = false

    async function loadGraph() {
      setLoading(true)
      try {
        const data = await getEntityGraph(worldId, entityId, {
          depth,
        })
        if (cancelled) return

        const { nodes: laidOutNodes, edges: laidOutEdges } = buildLayout(
          data,
          entityId,
        )

        setRawNodes(laidOutNodes)
        setRawEdges(laidOutEdges)

        const graphIdentityChanged =
          lastGraphIdentityRef.current.worldId !== worldId ||
          lastGraphIdentityRef.current.entityId !== rootId

        if (graphIdentityChanged) {
          setSelectedEntity(rootId)
          setContextMenu(CONTEXT_MENU_INITIAL_STATE)
          setShouldAutoFit(true)
        }

        const initialRoot = laidOutNodes.find((node) => node.id === rootId)
        if (initialRoot) {
          setRootPosition((prev) =>
            graphIdentityChanged ? initialRoot.position : prev || initialRoot.position,
          )
        }

        lastGraphIdentityRef.current = { worldId, entityId: rootId }

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
              style: getRelationshipStyle(id),
            })
          })
        }

        if (relationshipTypeMap.size === 0 && Array.isArray(laidOutEdges)) {
          laidOutEdges.forEach((edge) => {
            const relationships = Array.isArray(edge.data?.relationships)
              ? dedupeRelationshipSummaries(edge.data.relationships)
              : []

            if (relationships.length) {
              relationships.forEach((relationship) => {
                if (!relationship || relationship.typeId === null || relationship.typeId === undefined) {
                  return
                }
                const id = String(relationship.typeId)
                if (relationshipTypeMap.has(id)) return
                relationshipTypeMap.set(id, {
                  id,
                  name: relationship.typeName || `Relationship ${id}`,
                  fromName: null,
                  toName: null,
                  style: getRelationshipStyle(id),
                })
              })
              return
            }

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
              style: getRelationshipStyle(id),
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
                style: value.style || existing.style || getRelationshipStyle(key),
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
  }, [worldId, entityId, depth, rootId])

  const filteredGraph = useMemo(
    () =>
      applyLayerFilters(rawNodes, rawEdges, {
        layerMode,
        depthLimit: depth,
        rootId,
        hiddenRelationshipTypes,
      }),
    [rawNodes, rawEdges, layerMode, depth, rootId, hiddenRelationshipTypes],
  )

  useEffect(() => {
    if (!availableRelationshipTypes.length) return

    setFilters((prev) => {
      const currentHidden = prev.hiddenRelationshipTypes || []
      if (!currentHidden.length) {
        return prev
      }

      const validIds = new Set(
        availableRelationshipTypes.map((type) => String(type.id)),
      )
      const filteredHidden = currentHidden.filter((id) => validIds.has(id))
      if (filteredHidden.length === currentHidden.length) {
        return prev
      }

      return { ...prev, hiddenRelationshipTypes: filteredHidden }
    })
  }, [availableRelationshipTypes])

  useEffect(() => {
    setNodes(filteredGraph.nodes)
    setEdges(filteredGraph.edges)
  }, [filteredGraph, setEdges, setNodes])

  useEffect(() => {
    if (!filteredGraph.nodes.length) {
      setFocusedNodeId(null)
    } else if (focusedNodeId && !filteredGraph.nodes.some((node) => node.id === focusedNodeId)) {
      setFocusedNodeId(null)
    }
  }, [filteredGraph.nodes, focusedNodeId])

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

  const clearHoverState = useCallback(() => {
    setHoveredEdgeId(null)
    setHoveredEdgeNodes([])
  }, [])

  const onNodeClick = useCallback((_, node) => {
    setSelectedEntity(node.id)
    setContextMenu(CONTEXT_MENU_INITIAL_STATE)
    clearHoverState()
    setActiveEdgeId(null)
  }, [clearHoverState])

  const onNodeContextMenu = useCallback((event, node) => {
    event.preventDefault()
    event.stopPropagation()
    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      node,
    })
    setActiveEdgeId(null)
  }, [])

  const onEdgeMouseEnter = useCallback((_, edge) => {
    setHoveredEdgeId(edge.id)
    setHoveredEdgeNodes([String(edge.source), String(edge.target)])
  }, [])

  const onEdgeMouseLeave = useCallback(() => {
    clearHoverState()
  }, [clearHoverState])

  const onEdgeClick = useCallback(
    (event, edge) => {
      event?.preventDefault?.()
      event?.stopPropagation?.()
      if (!Array.isArray(edge?.data?.relationships) || edge.data.relationships.length === 0) {
        setActiveEdgeId(null)
        return
      }
      setContextMenu(CONTEXT_MENU_INITIAL_STATE)
      setActiveEdgeId(edge.id)
    },
    [],
  )

  const handleDepthChange = (event) => {
    const value = Number.parseInt(event.target.value, 10)
    const safeValue = Math.min(Math.max(Number.isNaN(value) ? 1 : value, 1), MAX_DEPTH)
    setFilters((prev) => ({ ...prev, depth: safeValue }))
  }

  const handleRelationshipTypeVisibilityChange = (typeId) => (event) => {
    const shouldShow = event.target.checked
    setFilters((prev) => {
      const id = String(typeId)
      const hidden = prev.hiddenRelationshipTypes || []
      const exists = hidden.includes(id)

      if (shouldShow) {
        if (!exists) return prev
        return {
          ...prev,
          hiddenRelationshipTypes: hidden.filter((value) => value !== id),
        }
      }

      if (exists) return prev

      return {
        ...prev,
        hiddenRelationshipTypes: [...hidden, id],
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

  const handlePaneInteraction = useCallback(() => {
    setContextMenu(CONTEXT_MENU_INITIAL_STATE)
    clearHoverState()
    setActiveEdgeId(null)
  }, [clearHoverState])

  const handleSearchSubmit = (event) => {
    event.preventDefault()
    if (!reactFlowInstance) return

    const query = searchValue.trim().toLowerCase()
    if (!query) {
      setFocusedNodeId(null)
      return
    }

    const targetNode = nodes.find((node) =>
      (node?.data?.label || '').toLowerCase().includes(query),
    )

    if (!targetNode) {
      return
    }

    setFocusedNodeId(targetNode.id)
    setSelectedEntity(targetNode.id)

    const viewNode = reactFlowInstance.getNode?.(targetNode.id) || targetNode
    if (viewNode) {
      reactFlowInstance.fitView({ nodes: [viewNode], padding: 0.8, duration: 400 })
    }
  }

  const handleClearSearch = () => {
    setSearchValue('')
    setFocusedNodeId(null)
    setActiveEdgeId(null)
  }

  useEffect(() => {
    setNodes((current) =>
      current.map((node) => {
        const data = node.data || {}
        const isFocused = focusedNodeId ? node.id === focusedNodeId : false
        const isSelected = selectedEntity ? node.id === selectedEntity : false
        const isHoverAdjacent = hoveredEdgeNodes.includes(String(node.id))
        const shouldDim =
          hoveredEdgeNodes.length > 0 && !isHoverAdjacent && !isSelected && !isFocused

        const nextData = {
          ...data,
          isHighlighted: isFocused || isSelected,
          isEdgeAdjacent: isHoverAdjacent,
          isDimmed: shouldDim,
        }

        if (
          data.isHighlighted === nextData.isHighlighted &&
          data.isEdgeAdjacent === nextData.isEdgeAdjacent &&
          data.isDimmed === nextData.isDimmed
        ) {
          return node
        }

        return {
          ...node,
          data: nextData,
        }
      }),
    )
  }, [focusedNodeId, hoveredEdgeNodes, selectedEntity, setNodes])

  useEffect(() => {
    setEdges((current) =>
      current.map((edge) => {
        const data = edge.data || {}
        const isHovered = hoveredEdgeId === edge.id
        const shouldDim = hoveredEdgeId && hoveredEdgeId !== edge.id

        const nextData = {
          ...data,
          isHovered,
          isDimmed: Boolean(shouldDim),
        }

        if (data.isHovered === nextData.isHovered && data.isDimmed === nextData.isDimmed) {
          return edge
        }

        return {
          ...edge,
          data: nextData,
        }
      }),
    )
  }, [hoveredEdgeId, setEdges])

  useEffect(() => {
    if (!activeEdgeId) {
      setActiveEdgeDetails(null)
      return
    }

    const targetEdge = edges.find((edge) => edge.id === activeEdgeId)
    if (!targetEdge || !Array.isArray(targetEdge.data?.relationships)) {
      setActiveEdgeDetails(null)
      return
    }

    const dedupedRelationships = dedupeRelationshipSummaries(
      targetEdge.data.relationships,
    )

    if (!dedupedRelationships.length) {
      setActiveEdgeDetails(null)
      return
    }

    setActiveEdgeDetails({
      id: targetEdge.id,
      source: targetEdge.source,
      target: targetEdge.target,
      sourceName: targetEdge.data?.sourceName || '',
      targetName: targetEdge.data?.targetName || '',
      relationships: dedupedRelationships,
    })
  }, [activeEdgeId, edges])

  return (
    <div className="flex h-full w-full">
      {/* Main graph area */}
      <div className="flex-1 relative bg-gray-950" style={{ height: '100vh' }}>
        <div className="graph-area">
          {loading ? (
            <div className="text-gray-400 text-sm p-4">Loading graph...</div>
          ) : (
            <>
              <div className="graph-canvas-container">
                <ReactFlow
                  nodeTypes={nodeTypes}
                  edgeTypes={edgeTypes}
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onNodeClick={onNodeClick}
                  onNodeContextMenu={onNodeContextMenu}
                  onEdgeClick={onEdgeClick}
                  onEdgeMouseEnter={onEdgeMouseEnter}
                  onEdgeMouseLeave={onEdgeMouseLeave}
                  onPaneClick={handlePaneInteraction}
                  onPaneContextMenu={handlePaneInteraction}
                  onInit={setReactFlowInstance}
                  style={{ width: '100%', height: '100%' }}
                >
                  <div className="graph-toolbar">
                    <form className="graph-search" onSubmit={handleSearchSubmit}>
                      <div className="graph-search-field">
                        <Search size={14} />
                        <input
                          type="search"
                          placeholder="Find entity..."
                          value={searchValue}
                          onChange={(event) => setSearchValue(event.target.value)}
                        />
                        {searchValue ? (
                          <button
                            type="button"
                            className="graph-search-clear"
                            onClick={handleClearSearch}
                            aria-label="Clear search"
                          >
                            ×
                          </button>
                        ) : null}
                      </div>
                      <button type="submit" className="graph-search-submit">
                        Jump
                      </button>
                    </form>
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
                    <button
                      type="button"
                      onClick={() => {
                        if (!reactFlowInstance) return
                        reactFlowInstance.fitView({ padding: 0.4, duration: 400 })
                        setSearchValue('')
                        setFocusedNodeId(null)
                      }}
                    >
                      Reset View
                    </button>
                  </div>
                  <MiniMap
                    nodeColor={(node) =>
                      node?.data?.isHighlighted
                        ? '#facc15'
                        : node?.data?.isEdgeAdjacent
                        ? '#38bdf8'
                        : '#1e293b'
                    }
                    nodeStrokeColor={(node) =>
                      node?.data?.isHighlighted ? '#fde68a' : '#334155'
                    }
                  />
                  <Controls />
                  <Background color="#222" gap={16} />
                </ReactFlow>
                {activeEdgeDetails ? (
                  <div className="graph-edge-detail">
                    <div className="graph-edge-detail-header">
                      <div>
                        <p className="graph-edge-detail-title">Relationships</p>
                        <p className="graph-edge-detail-entities">
                          {(activeEdgeDetails.sourceName || activeEdgeDetails.source) &&
                          (activeEdgeDetails.targetName || activeEdgeDetails.target)
                            ? `${activeEdgeDetails.sourceName || activeEdgeDetails.source} ↔ ${
                                activeEdgeDetails.targetName || activeEdgeDetails.target
                              }`
                            : 'Between selected entities'}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="graph-edge-detail-close"
                        onClick={() => setActiveEdgeId(null)}
                        aria-label="Close relationship details"
                      >
                        ×
                      </button>
                    </div>
                    {activeEdgeDetails.relationships.length ? (
                      <ul className="graph-edge-detail-list">
                        {activeEdgeDetails.relationships.map((relationship) => (
                          <li key={relationship.id} className="graph-edge-detail-item">
                            <span className="graph-edge-detail-item-label">
                              {relationship.label || relationship.typeName || 'Relationship'}
                            </span>
                            {relationship.typeName ? (
                              <span className="graph-edge-detail-item-type">
                                {relationship.typeName}
                              </span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="graph-edge-detail-empty">No relationships to display.</p>
                    )}
                  </div>
                ) : null}
              </div>

              <aside className="graph-filter-sidebar">
                <div className="graph-filter-header">
                  <Filter size={14} /> Filters
                </div>

                <div className="graph-filter-group">
                  <label className="graph-filter-label">Relationship Depth (1-3)</label>
                  <input
                    type="number"
                    min={1}
                    max={MAX_DEPTH}
                    value={depth}
                    onChange={handleDepthChange}
                    className="graph-filter-input"
                  />
                </div>

                <div className="graph-filter-group">
                  <span className="graph-filter-label">Relationship Layers</span>
                  <div className="graph-filter-options">
                    <label className="graph-filter-option">
                      <input
                        type="radio"
                        name="layerMode"
                        value="direct"
                        checked={layerMode === 'direct'}
                        onChange={handleLayerModeChange}
                        className="graph-filter-radio"
                      />
                      <span>
                        Direct relationships only
                        <span className="graph-filter-option-note">
                          Show links connected directly to the focused entity.
                        </span>
                      </span>
                    </label>
                    <label className="graph-filter-option">
                      <input
                        type="radio"
                        name="layerMode"
                        value="board"
                        checked={layerMode === 'board'}
                        onChange={handleLayerModeChange}
                        className="graph-filter-radio"
                      />
                      <span>
                        Include on-board relationships
                        <span className="graph-filter-option-note">
                          Reveal links between entities already shown on the board.
                        </span>
                      </span>
                    </label>
                    <label className="graph-filter-option">
                      <input
                        type="radio"
                        name="layerMode"
                        value="extended"
                        checked={layerMode === 'extended'}
                        onChange={handleLayerModeChange}
                        className="graph-filter-radio"
                      />
                      <span>
                        Extended relationships
                        <span className="graph-filter-option-note">
                          Explore additional layers up to the selected depth.
                        </span>
                      </span>
                    </label>
                  </div>
                </div>

                <div className="graph-filter-group">
                  <div className="graph-filter-group-header">
                    <span className="graph-filter-label">Relationship Types</span>
                    {hiddenRelationshipTypes.length > 0 ? (
                      <button
                        type="button"
                        onClick={() =>
                          setFilters((prev) => ({ ...prev, hiddenRelationshipTypes: [] }))
                        }
                        className="graph-filter-clear"
                      >
                        Reset
                      </button>
                    ) : null}
                  </div>
                  <p className="graph-filter-description">
                    Uncheck a type to hide its relationships from the graph.
                  </p>

                  {availableRelationshipTypes.length ? (
                    <div className="graph-filter-type-list">
                      {availableRelationshipTypes.map((type) => {
                        const id = String(type.id)
                        const isChecked = !hiddenRelationshipTypes.includes(id)
                        const style = type.style || getRelationshipStyle(id)
                        return (
                          <label key={id} className="graph-filter-type">
                            <div className="graph-filter-type-row">
                              <span
                                className="graph-filter-type-dot"
                                style={{
                                  background: style.color,
                                  borderStyle: style.strokeDasharray ? 'dashed' : 'solid',
                                }}
                              />
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={handleRelationshipTypeVisibilityChange(id)}
                                aria-label={`Display ${type.name} relationships`}
                              />
                              <span className="graph-filter-type-name">{type.name}</span>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="graph-filter-empty">No relationship types loaded yet.</p>
                  )}
                  {hiddenRelationshipTypes.length > 0 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setFilters((prev) => ({ ...prev, hiddenRelationshipTypes: [] }))
                      }
                      className="graph-filter-reset"
                    >
                      Show all relationship types
                    </button>
                  ) : null}
                </div>
              </aside>
            </>
          )}
        </div>

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
