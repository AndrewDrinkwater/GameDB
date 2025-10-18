// src/components/CustomEdge.jsx

import React from 'react';
import { EdgeText } from 'reactflow'; // You can use EdgeText to display the edge label

const CustomEdge = ({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, label }) => {
  // Calculate mid point to place the label, or use a predefined position
  const edgeLabelPosition = {
    x: (sourceX + targetX) / 2,
    y: (sourceY + targetY) / 2
  };

  return (
    <g className="react-flow__edge" style={{ pointerEvents: 'none' }}>
      <path
        className="react-flow__edge-path"
        d={`M${sourceX},${sourceY}C${sourceX + 50},${sourceY} ${targetX - 50},${targetY} ${targetX},${targetY}`}
        fill="transparent"
        stroke="#FF0000"
        strokeWidth={2}
      />
      {/* You can place the edge label in the middle of the edge */}
      <EdgeText x={edgeLabelPosition.x} y={edgeLabelPosition.y} label={label} />
    </g>
  );
};

export default CustomEdge;
