// src/components/CustomNode.jsx

import React from 'react';

// This is a simple custom node rendering with a label
const CustomNode = ({ data }) => {
  return (
    <div className="custom-node p-2 bg-blue-600 text-white rounded">
      <div>{data.label}</div>
      <div>{data.type}</div>
    </div>
  );
};

export default CustomNode;
