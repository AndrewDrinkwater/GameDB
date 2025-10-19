import { useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';

import DetailsPanel from './DetailsPanel.jsx';
import FilterPanel from './FilterPanel.jsx';
import GraphView from './GraphView.jsx';
import { useEntityGraph } from './hooks/useEntityGraph';

export default function EntityExplorer() {
  const { worldId, entityId } = useParams();
  const [filters, setFilters] = useState({ relationshipTypes: [], depth: 1 });
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  const {
    nodes,
    edges,
    loading,
    selectedEntity,
    setSelectedEntity,
    onNodesChange,
    onEdgesChange,
    refreshGraph,
  } = useEntityGraph({ worldId, entityId, filters, reactFlowInstance });

  const handleDepthChange = useCallback((depth) => {
    const nextDepth = Math.min(Math.max(depth, 1), 3);
    setFilters((current) => ({ ...current, depth: nextDepth }));
  }, []);

  const handleNodeClick = useCallback((_, node) => {
    setSelectedEntity(node.id);
  }, [setSelectedEntity]);

  return (
    <div className="flex h-full w-full">
      <FilterPanel depth={filters.depth} onDepthChange={handleDepthChange} onApply={refreshGraph} />

      <div className="flex-1 relative bg-gray-950" style={{ width: '100%', height: '100%' }}>
        {loading ? (
          <div className="text-gray-400 text-sm p-4">Loading graph...</div>
        ) : (
          <GraphView
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            onInit={setReactFlowInstance}
          />
        )}
      </div>

      <DetailsPanel selectedEntity={selectedEntity} onClose={() => setSelectedEntity(null)} />
    </div>
  );
}
