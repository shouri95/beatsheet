// src/components/Playground/SceneLinking/ConnectionLine.tsx

import React, { useMemo } from 'react';
import { getBezierPath, Position } from 'reactflow';

interface ConnectionLineProps {
  fromNode: { id: string; position: { x: number; y: number } };
  toNode: { id: string; position: { x: number; y: number } };
  fromPosition?: Position;
  toPosition?: Position;
  connectionLineStyle?: React.CSSProperties;
}

const ConnectionLine: React.FC<ConnectionLineProps> = ({
  fromNode,
  toNode,
  fromPosition = Position.Bottom,
  toPosition = Position.Top,
  connectionLineStyle,
}) => {
  const [edgePath, labelX, labelY] = useMemo(() => {
    const sourceX = fromNode.position.x;
    const sourceY = fromNode.position.y;
    const targetX = toNode.position.x;
    const targetY = toNode.position.y;

    const [path, x, y] = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition: fromPosition,
      targetX,
      targetY,
      targetPosition: toPosition,
    });

    return [path, x, y];
  }, [fromNode.position, toNode.position, fromPosition, toPosition]);

  return (
    <>
      <path
        id={`edge-${fromNode.id}-${toNode.id}`}
        className="react-flow__edge-path"
        d={edgePath}
        style={connectionLineStyle}
      />
      <text>
        <textPath
          href={`#edge-${fromNode.id}-${toNode.id}`}
          style={{ fontSize: 12 }}
          startOffset="50%"
          textAnchor="middle"
        >
          Connection
        </textPath>
      </text>
    </>
  );
};

export default ConnectionLine;