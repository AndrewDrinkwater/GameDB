export const getEntityGraph = async (req, res) => {
  try {
    const { id } = req.params

    const nodes = [
      { id, name: 'Center Entity' },
      { id: 'n1', name: 'Alpha' },
      { id: 'n2', name: 'Beta' },
      { id: 'n3', name: 'Gamma' },
      { id: 'n4', name: 'Delta' },
      { id: 'n5', name: 'Epsilon' },
    ]

    const edges = [
      { id: 'e1', source: id, target: 'n1', type: { id: 'friend', name: 'Friend' } },
      { id: 'e2', source: id, target: 'n2', type: { id: 'ally', name: 'Ally' } },
      { id: 'e3', source: id, target: 'n3', type: { id: 'ally', name: 'Ally' } },
      { id: 'e4', source: id, target: 'n4', type: { id: 'ally', name: 'Ally' } },
      { id: 'e5', source: id, target: 'n5', type: { id: 'ally', name: 'Ally' } },
    ]

    res.json({ success: true, data: { nodes, edges } })
  } catch (err) {
    console.error('getEntityGraph error:', err)
    res.status(500).json({ success: false, message: 'Internal error' })
  }
}
