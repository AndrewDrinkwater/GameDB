// src/components/CustomNode.jsx

import React from 'react';
import { Handle, Position } from 'reactflow';

const CustomNode = ({ data }) => {
  const { label, type, isRoot } = data || {};

  return (
    <div
      className={`relative min-w-[200px] max-w-[240px] rounded-xl border px-4 py-3 shadow-lg transition-all ${
        isRoot
          ? 'border-cyan-400 bg-slate-900/90 ring-2 ring-cyan-500/40'
          : 'border-slate-700 bg-slate-900/80'
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2.5 !w-2.5 !-mt-1 !border-2 !border-slate-900"
        style={{ background: '#22d3ee' }}
      />

      <div className="flex flex-col gap-1 text-slate-100">
        <span className="text-sm font-semibold leading-tight">{label}</span>
        {type ? (
          <span className="text-xs uppercase tracking-wide text-slate-400">{type}</span>
        ) : null}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2.5 !w-2.5 !-mb-1 !border-2 !border-slate-900"
        style={{ background: '#38bdf8' }}
      />
    </div>
  );
};

export default CustomNode;
