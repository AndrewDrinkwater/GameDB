import { useCallback, useEffect, useState } from 'react';
import { useEdgesState, useNodesState } from 'reactflow';

import { getEntityGraph } from '../../../api/entities';
import { buildFlowEdges, buildFlowNodes } from '../utils/graphTransforms';

export function useEntityGraph({ worldId, entityId, filters, reactFlowInstance }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntity, setSelectedEntity] = useState(null);

  const fetchGraph = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getEntityGraph(worldId, entityId, filters);
      const flowNodes = buildFlowNodes(data?.nodes);
      const flowEdges = buildFlowEdges(data?.edges);

      setNodes(flowNodes);
      setEdges(flowEdges);
      setSelectedEntity(null);
    } catch (error) {
      console.error('Error loading graph', error);
    } finally {
      setLoading(false);
    }
  }, [worldId, entityId, filters, setNodes, setEdges]);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  useEffect(() => {
    if (!reactFlowInstance || nodes.length === 0) {
      return;
    }

    const focusNode = nodes.find((node) => node.id === entityId);
    if (focusNode) {
      const { x, y } = focusNode.position;
      reactFlowInstance.setCenter(x, y, { zoom: 2 });
    }
  }, [reactFlowInstance, nodes, entityId]);

  return {
    nodes,
    edges,
    loading,
    selectedEntity,
    setSelectedEntity,
    onNodesChange,
    onEdgesChange,
    refreshGraph: fetchGraph,
  };
}
