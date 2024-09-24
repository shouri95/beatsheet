// src/components/Playground/CustomRelationshipEdge.tsx

"use client"

import React from 'react'
import { EdgeProps, getBezierPath } from 'reactflow'

const CustomRelationshipEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  return (
    <>
      <path id={id} style={style} className="react-flow__edge-path" d={edgePath} markerEnd={markerEnd} />
      <text x={labelX} y={labelY} fill="black" fontSize={12} textAnchor="middle">
        Relationship
      </text>
    </>
  )
}

export default CustomRelationshipEdge
