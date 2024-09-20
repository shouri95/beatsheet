// src/components/Playground/PlaygroundCanvas.tsx

"use client"

import React, { useCallback, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { RootState } from '../../store'
import ReactFlow, {
  Node,
  Edge,
  Connection,
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  ConnectionLineType,
} from 'reactflow'
import 'reactflow/dist/style.css'
import CustomSceneNode from './CustomSceneNode'
import { addConnection } from '../../store/connectionsSlice'

const nodeTypes = {
  scene: CustomSceneNode,
}

const PlaygroundCanvas: React.FC = () => {
  const dispatch = useDispatch()
  const scenes = useSelector((state: RootState) => state.scenes.scenes)
  const connections = useSelector((state: RootState) => state.connections.connections)

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  // Synchronize nodes with scenes from the Redux store
  useEffect(() => {
    const updatedNodes: Node[] = scenes.map((scene) => ({
      id: scene.id,
      type: 'scene',
      data: { scene },
      position: { x: scene.position.x, y: scene.position.y },
    }))
    setNodes(updatedNodes)
  }, [scenes, setNodes])

  // Synchronize edges with connections from the Redux store
  useEffect(() => {
    const updatedEdges: Edge[] = connections.map((conn) => ({
      id: `e${conn.from}-${conn.to}`,
      source: conn.from,
      target: conn.to,
      animated: true,
      type: ConnectionLineType.SmoothStep,
    }))
    setEdges(updatedEdges)
  }, [connections, setEdges])

  const onConnectHandler = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge(params, eds))
      if (params.source && params.target) {
        dispatch(addConnection({ from: params.source, to: params.target }))
      }
    },
    [dispatch, setEdges]
  )

  return (
    <div className="h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnectHandler}
        nodeTypes={nodeTypes}
        snapToGrid={true}
        snapGrid={[15, 15]}
        fitView
      >
        <Background color="#e0e0e0" gap={16} />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  )
}

export default PlaygroundCanvas
