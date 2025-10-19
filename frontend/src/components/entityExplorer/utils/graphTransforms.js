export function buildFlowNodes(nodes = []) {
  return nodes.map((node, index) => {
    const position = {
      x: index * 150,
      y: index % 2 === 0 ? 200 : 100,
    };

    return {
      id: node.id,
      data: { label: node.name, type: node.type },
      position,
    };
  });
}

export function buildFlowEdges(edges = []) {
  return edges.map((edge) => ({
    id: `${edge.source}-${edge.target}`,
    source: edge.source,
    target: edge.target,
    label: edge.label || 'Relationship',
    animated: false,
  }));
}
