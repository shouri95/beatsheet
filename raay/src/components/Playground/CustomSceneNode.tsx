// src/components/Playground/CustomSceneNode.tsx
import React from 'react'
import { Handle, Position } from 'reactflow'
import { useSelector } from 'react-redux'
import { RootState } from '../../store'
import SceneBox from './SceneBox/SceneBox'
import { cn } from '../../lib/utils'

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
  const connectionMode = useSelector((state: RootState) => state.ui.connectionMode)
  const activeConnectionType = useSelector((state: RootState) => state.ui.activeConnectionType)

  const connectionTypes = {
    sequential: '#4f46e5',
    nonLinear: '#f97316',
    reference: '#10b981',
    arc: '#a855f7',
    parallel: '#ef4444',
    thematic: '#6b7280',
    dialogue: '#ec4899',
  }

  return (
    <div className={cn(
      'relative',
      connectionMode && 'ring-2 ring-offset-2',
      connectionMode && activeConnectionType && `ring-${connectionTypes[activeConnectionType as keyof typeof connectionTypes]}`
    )}>
      <Handle type="target" position={Position.Top} />
      <SceneBox data={data} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}

export default CustomSceneNode