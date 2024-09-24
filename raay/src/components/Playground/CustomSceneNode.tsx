// src/components/Playground/CustomSceneNode.tsx
"use client"

import React from 'react'
import { Handle, Position } from 'reactflow'
import SceneBox from './SceneBox'

interface CustomSceneNodeProps {
  data: {
    scene: {
      id: string
      title: string
      scriptContent: string
      position: { x: number; y: number }
      size: { width: number; height: number }
      characters: string[]
      color: string
    }
    index: number
  }
}

const CustomSceneNode: React.FC<CustomSceneNodeProps> = ({ data }) => {
  return (
    <>
      <Handle type="target" position={Position.Top} />
      <SceneBox data={data} index={data.index} />
      <Handle type="source" position={Position.Bottom} />
    </>
  )
}

export default CustomSceneNode