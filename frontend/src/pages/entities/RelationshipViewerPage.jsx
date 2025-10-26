import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState
} from 'reactflow'
import 'reactflow/dist/style.css'
import { getEntityGraph } from '../../api/entities.js'

export default function RelationshipViewerPage() {
  const { entityId } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  const loadGraph = useCallback(async () => {
    try {
      setLoading(true)
      const result = await getEntityGraph(entityId)
      if (!result?.nodes || !result?.edges) throw new Error('Invalid graph data')

      // Convert data into ReactFlow format
      const rfNodes = result.nodes.map((n, i) => ({
        id: String(n.id),
        type: 'default',
        position: { x: i * 150, y: i * 100 },
        data: { label: n.name || n.label || `Entity ${n.id}` }
      }))

      const rfEdges = result.edges.map((e, index) => ({
        id: e.id ? String(e.id) : `${e.source}-${e.target}-${index}`,
        source: String(e.source),
        target: String(e.target),
        label: e.type?.name || e.type?.label || e.label || '',
        animated: true
      }))

      setNodes(rfNodes)
      setEdges(rfEdges)
      setError(null)
    } catch (err) {
      console.error('Failed to load entity graph', err)
      setError(err.message || 'Failed to load graph')
    } finally {
      setLoading(false)
    }
  }, [entityId])

  useEffect(() => {
    if (entityId) {
      loadGraph()
    }
  }, [entityId, loadGraph])

  if (loading) return <p className="p-4">Loading graph...</p>
  if (error) return <p className="p-4 text-red-500">Error: {error}</p>

  return (
    <div className="h-screen w-full bg-gray-100">
      <h1 className="text-2xl font-bold p-4">Relationship Viewer</h1>
      <div className="h-[80vh] w-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
        >
          <MiniMap />
          <Controls />
          <Background gap={16} />
        </ReactFlow>
      </div>
    </div>
  )
}
