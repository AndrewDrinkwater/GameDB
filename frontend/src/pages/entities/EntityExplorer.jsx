import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  MarkerType,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { getEntityGraph } from '../../api/entities';
import { Filter, Info } from 'lucide-react';
import EntityInfoPreview from "../../components/entities/EntityInfoPreview.jsx";
import { nodeTypes, edgeTypes } from '../../components/graphTypes';

const HORIZONTAL_SPACING = 240;
const VERTICAL_SPACING = 220;

const buildLayout = (graphData, rootId) => {
  if (!graphData || !Array.isArray(graphData.nodes)) {
    return { nodes: [], edges: [] };
  }

  const rootKey = String(rootId);
  const nodesMap = new Map();
  graphData.nodes.forEach((node) => {
    if (!node || !node.id) return;
    const id = String(node.id);
    nodesMap.set(id, {
      ...node,
      id,
    });
  });

  if (!nodesMap.has(rootKey) && graphData.root) {
    const rootNode = graphData.root;
    nodesMap.set(rootKey, {
      ...rootNode,
      id: rootKey,
    });
  }

  if (!nodesMap.has(rootKey)) {
    return {
      nodes: Array.from(nodesMap.values()),
      edges: graphData.edges || [],
    };
  }

  const adjacency = new Map();
  (graphData.edges || []).forEach((edge) => {
    if (!edge) return;
    const sourceId = String(edge.source);
    const targetId = String(edge.target);
    if (!adjacency.has(sourceId)) adjacency.set(sourceId, []);
    if (!adjacency.has(targetId)) adjacency.set(targetId, []);
    adjacency.get(sourceId).push({ id: targetId, direction: 'out' });
    adjacency.get(targetId).push({ id: sourceId, direction: 'in' });
  });

  const visited = new Set([rootKey]);
  const nodeMeta = new Map([
    [rootKey, { depth: 0, orientation: 'center', firstDirection: null }],
  ]);
  const queue = [rootKey];

  while (queue.length) {
    const currentId = queue.shift();
    const currentMeta = nodeMeta.get(currentId);
    const neighbors = adjacency.get(currentId) || [];

    neighbors.forEach(({ id: neighborId, direction }) => {
      if (visited.has(neighborId)) return;
      visited.add(neighborId);

      const nextDepth = (currentMeta?.depth ?? 0) + 1;
      const nextFirstDirection =
        currentMeta?.firstDirection ?? (direction === 'in' ? 'top' : 'bottom');
      const orientation = nextFirstDirection ?? 'center';

      nodeMeta.set(neighborId, {
        depth: nextDepth,
        orientation,
        firstDirection: nextFirstDirection,
      });
      queue.push(neighborId);
    });
  }

  const groupedByRow = new Map();
  nodeMeta.forEach((meta, id) => {
    if (id === rootKey) return;
    if (!meta || !meta.orientation || meta.orientation === 'center') return;
    const key = `${meta.orientation}-${meta.depth}`;
    if (!groupedByRow.has(key)) {
      groupedByRow.set(key, []);
    }
    groupedByRow.get(key).push(id);
  });

  const positions = new Map();
  positions.set(rootKey, { x: 0, y: 0 });

  groupedByRow.forEach((ids, key) => {
    const [orientation, depthStr] = key.split('-');
    const depth = Number.parseInt(depthStr, 10) || 1;
    const yOffset =
      orientation === 'top'
        ? -depth * VERTICAL_SPACING
        : depth * VERTICAL_SPACING;

    ids.sort((a, b) => {
      const nodeA = nodesMap.get(a);
      const nodeB = nodesMap.get(b);
      return (nodeA?.name || '').localeCompare(nodeB?.name || '');
    });

    const startX = -((ids.length - 1) * HORIZONTAL_SPACING) / 2;
    ids.forEach((id, index) => {
      positions.set(id, {
        x: startX + index * HORIZONTAL_SPACING,
        y: yOffset,
      });
    });
  });

  // Position any nodes not yet placed (fallback layout)
  let unplacedIndex = 0;
  nodesMap.forEach((node, id) => {
    if (positions.has(id)) return;
    positions.set(id, {
      x: (unplacedIndex - 0.5) * HORIZONTAL_SPACING,
      y: VERTICAL_SPACING * 2,
    });
    unplacedIndex += 1;
  });

  const laidOutNodes = Array.from(nodesMap.values()).map((node) => ({
    id: node.id,
    data: {
      label: node.name,
      type: node.type,
      isRoot: node.id === rootKey,
    },
    position: positions.get(node.id) || { x: 0, y: 0 },
    type: 'customNode',
  }));

  return {
    nodes: laidOutNodes,
    edges: graphData.edges || [],
  };
};

export default function EntityExplorer() {
  const { worldId, entityId } = useParams();
  
  const [filters, setFilters] = useState({
    relationshipTypes: [],
    depth: 1,
  });
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchGraph = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getEntityGraph(worldId, entityId, filters);
      const { nodes: flowNodes, edges: layoutEdges } = buildLayout(
        data,
        entityId,
      );

      const rootId = String(entityId);
      const flowEdges = (layoutEdges || []).map((edge) => {
        const relationshipType = edge.relationshipType || {};
        const sourceId = String(edge.source);
        const targetId = String(edge.target);

        const rootIsSource = sourceId === rootId;
        const rootIsTarget = targetId === rootId;
        let label = edge.label;

        if (relationshipType) {
          if (rootIsSource) {
            label =
              relationshipType.fromName ||
              relationshipType.name ||
              edge.label;
          } else if (rootIsTarget) {
            label =
              relationshipType.toName || relationshipType.name || edge.label;
          } else {
            label = relationshipType.name || edge.label;
          }
        }

        return {
          id: String(edge.id || `${sourceId}-${targetId}`),
          source: sourceId,
          target: targetId,
          label,
          data: {
            relationshipTypeId: edge.relationshipTypeId || edge.type || null,
          },
          animated: false,
          type: 'customEdge',
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#38bdf8',
            width: 18,
            height: 18,
          },
        };
      });

      setNodes(flowNodes);
      setEdges(flowEdges);
      setSelectedEntity(rootId);
    } catch (err) {
      console.error('Error loading graph', err);
    } finally {
      setLoading(false);
    }
  }, [worldId, entityId, filters, setEdges, setNodes, setSelectedEntity]);

  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  useEffect(() => {
    if (!reactFlowInstance) return;
    if (!nodes.length) return;

    const timeout = setTimeout(() => {
      reactFlowInstance.fitView({ padding: 0.2, duration: 400 });
    }, 0);

    return () => clearTimeout(timeout);
  }, [reactFlowInstance, nodes, edges]);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  const onNodeClick = useCallback((_, node) => {
    setSelectedEntity(node.id);
  }, []);

  return (
    <div className="flex h-full w-full">
      {/* Left filter panel */}
      <div className="w-64 bg-gray-900 text-gray-100 border-r border-gray-700 p-3 flex flex-col gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Filter size={16} /> Filters
        </div>
        <label className="text-xs mt-2">Depth</label>
        <input
          type="number"
          min={1}
          max={3}
          value={filters.depth}
          onChange={(e) =>
            setFilters((f) => ({ ...f, depth: parseInt(e.target.value, 10) }))}
          className="bg-gray-800 border border-gray-700 p-1 rounded text-sm"
        />
        <button
          onClick={fetchGraph}
          className="mt-auto bg-blue-600 hover:bg-blue-700 text-white py-1 px-2 rounded text-sm"
        >
          Apply
        </button>
      </div>

      {/* Main graph area */}
      <div className="flex-1 relative bg-gray-950" style={{ height: '100vh' }}>
        {loading ? (
          <div className="text-gray-400 text-sm p-4">Loading graph...</div>
        ) : (
          <ReactFlow
            nodeTypes={nodeTypes}  // Use pre-defined nodeTypes here
            edgeTypes={edgeTypes}  // Use pre-defined edgeTypes here
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            fitView
            onInit={setReactFlowInstance}
            style={{ width: '100%', height: '100%' }}  // Ensure proper dimensions
          >
            <MiniMap />
            <Controls />
            <Background color="#222" gap={16} />
          </ReactFlow>
        )}
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
  );
}
