// src/components/CustomEdge.jsx

import React from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from 'reactflow';
import './graphStyles.css';

const CustomEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  label,
  data,
}) => {
  const multiCount = data?.multiCount || 1;
  const multiIndex = data?.multiIndex || 0;
  const offsetIndex = multiCount > 1 ? multiIndex - (multiCount - 1) / 2 : 0;
  const curvature = Math.min(1.2, Math.max(0.1, 0.5 + offsetIndex * 0.25));

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    curvature,
  });

  const style = data?.style || {};
  const stroke = style.color || '#38bdf8';
  const strokeDasharray = style.strokeDasharray;
  const labelColor = style.labelColor || '#bae6fd';
  const labelBackground = style.labelBackground || 'rgba(10, 12, 24, 0.92)';
  const isHovered = Boolean(data?.isHovered);
  const isDimmed = Boolean(data?.isDimmed);

  const labelLines = typeof label === 'string' ? label.split('\n') : [label];
  const tooltip = data?.tooltip;

  const opacity = isHovered ? 1 : isDimmed ? 0.35 : 0.8;
  const strokeWidth = isHovered ? 3.2 : 2.2;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={{ ...markerEnd, color: stroke }}
        style={{
          stroke,
          strokeWidth,
          strokeDasharray,
          opacity,
          transition: 'stroke-width 120ms ease, opacity 120ms ease',
        }}
      />
      {label ? (
        <EdgeLabelRenderer>
          <div
            className="custom-edge-label"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              color: labelColor,
              background: labelBackground,
              borderColor: `${stroke}55`,
              opacity: isDimmed && !isHovered ? 0.7 : 1,
            }}
            title={tooltip}
          >
            {labelLines.map((line, index) => (
              <span key={`${id}-${index}`} className="custom-edge-label-line">
                {line}
              </span>
            ))}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
};

export default CustomEdge;
