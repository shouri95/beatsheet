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
      props: string[]
      color: string
    }
  }
}

const CustomSceneNode: React.FC<CustomSceneNodeProps> = ({ data }) => {
  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} />
      <div className="resizable">
        <SceneBox data={data} />
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}

export default CustomSceneNode
