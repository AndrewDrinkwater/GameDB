// src/components/CustomNode.jsx

import React from 'react';
import { Handle, Position } from 'reactflow';
import './graphStyles.css';

const HANDLE_STYLE = {
  width: 10,
  height: 10,
  borderRadius: '50%',
  border: '2px solid #0f172a',
};

const CustomNode = ({ data }) => {
  const { label, type, isRoot, isHighlighted, isEdgeAdjacent, isDimmed } = data || {};

  const classes = ['custom-node-card'];
  if (isRoot) classes.push('is-root');
  if (isHighlighted) classes.push('is-highlighted');
  if (isEdgeAdjacent && !isHighlighted) classes.push('is-adjacent');
  if (isDimmed) classes.push('is-dimmed');

  return (
    <div className={classes.join(' ')}>
      <Handle
        type="target"
        position={Position.Top}
        style={{ ...HANDLE_STYLE, marginTop: -8, background: '#22d3ee' }}
      />

      <div className="custom-node-content">
        <span className="custom-node-name">{label}</span>
        {type ? <span className="custom-node-type">{type}</span> : null}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ ...HANDLE_STYLE, marginBottom: -8, background: '#38bdf8' }}
      />
    </div>
  );
};

export default CustomNode;
