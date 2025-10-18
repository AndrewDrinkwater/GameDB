import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { getEntityGraph } from '../../api/entities';
import { Filter, Info } from 'lucide-react';
import EntityInfoPreview from "../../components/entities/EntityInfoPreview.jsx";
import { nodeTypes, edgeTypes } from '../../components/GraphTypes'; // Import statically defined types

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
      const flowNodes = data.nodes.map((n) => ({
        id: n.id,
        data: { label: n.name, type: n.type },
        position: { x: Math.random() * 800, y: Math.random() * 600 },
      }));
      const flowEdges = data.edges.map((e) => ({
        id: `${e.source}-${e.target}`,
        source: e.source,
        target: e.target,
        label: e.label || e.type,
        animated: false,
      }));
      setNodes(flowNodes);
      setEdges(flowEdges);
    } catch (err) {
      console.error('Error loading graph', err);
    } finally {
      setLoading(false);
    }
  }, [worldId, entityId, filters]);

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
