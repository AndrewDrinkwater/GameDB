import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import ReactFlow, { Background, Controls, ReactFlowProvider } from 'reactflow'
import 'reactflow/dist/style.css'

import { getEntityGraph } from '../../api/entities.js'

export default function RelationshipViewerPage() {
  const { worldId, entityId } = useParams()
  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function loadGraph() {
      try {
        setLoading(true)
        setError(null)
        const data = await getEntityGraph(worldId, entityId)

        if (!data?.nodes?.length) {
          setNodes([])
          setEdges([])
          return
        }

        const formattedNodes = data.nodes.map((n) => ({
          id: n.id.toString(),
          data: { label: n.name || n.label || `Entity ${n.id}` },
          position: {
            x: Math.random() * 600 - 300,
            y: Math.random() * 400 - 200,
          },
          style: {
            borderRadius: 10,
            padding: 8,
            background: n.id === entityId ? '#374151' : '#1f2937',
            color: '#e5e7eb',
            textAlign: 'center',
            width: 200,
            height: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: n.id === entityId ? 600 : 400,
            boxShadow:
              n.id === entityId
                ? '0 8px 24px rgba(0,0,0,0.35)'
                : '0 4px 12px rgba(0,0,0,0.2)',
          },
        }))

        const formattedEdges = data.edges.map((e) => ({
          id: e.id?.toString() || `${e.source}-${e.target}`,
          source: e.source?.toString(),
          target: e.target?.toString(),
          label:
            e.relationshipType?.name ||
            e.relationshipType?.label ||
            e.label ||
            'related',
          type: 'smoothstep',
        }))

        setNodes(formattedNodes)
        setEdges(formattedEdges)
      } catch (err) {
        console.error('Failed to load graph:', err)
        setError('Unable to load relationship data')
      } finally {
        setLoading(false)
      }
    }

    if (worldId && entityId) loadGraph()
  }, [worldId, entityId])

  const graphContent = useMemo(() => {
    if (loading)
      return (
        <div className="flex items-center justify-center h-full text-gray-400">
          Loading relationships…
        </div>
      )

    if (error)
      return (
        <div className="flex items-center justify-center h-full text-red-400">
          {error}
        </div>
      )

    if (!nodes.length)
      return (
        <div className="flex items-center justify-center h-full text-gray-400">
          No relationships found.
        </div>
      )

    return (
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background />
          <Controls />
        </ReactFlow>
      </ReactFlowProvider>
    )
  }, [nodes, edges, loading, error])

  return (
    <div className="w-full h-full flex flex-col bg-gray-950">
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900">
        <h1 className="text-lg font-semibold text-gray-100">Relationship Viewer</h1>
      </header>

      <div
        className="flex-1 relative"
        style={{ width: '100%', height: 'calc(100vh - 64px)' }}
      >
        {graphContent}
      </div>
    </div>
  )
}
