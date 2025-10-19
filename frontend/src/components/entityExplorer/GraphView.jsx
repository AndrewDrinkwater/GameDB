import ReactFlow, { Background, Controls, MiniMap } from 'reactflow';
import 'reactflow/dist/style.css';

export default function GraphView({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onNodeClick,
  onInit,
}) {
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={onNodeClick}
      onInit={onInit}
      fitView
      style={{ width: '100%', height: '100%' }}
    >
      <MiniMap />
      <Controls />
      <Background color="#222" gap={16} />
    </ReactFlow>
  );
}
