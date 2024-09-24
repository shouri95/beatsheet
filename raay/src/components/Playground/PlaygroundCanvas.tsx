// src/components/Playground/PlaygroundCanvas.tsx
"use client"

import React, { useCallback } from 'react'
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
import CustomRelationshipEdge from './CustomRelationshipEdge'
import { addConnection } from '../../store/connectionsSlice'

const nodeTypes = {
  scene: CustomSceneNode,
}

const edgeTypes = {
  relationship: CustomRelationshipEdge,
}

const PlaygroundCanvas: React.FC = () => {
  const dispatch = useDispatch()
  const scenes = useSelector((state: RootState) => state.scenes.scenes)
  const connections = useSelector((state: RootState) => state.connections.connections)

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  // Synchronize nodes with scenes from the Redux store
  React.useEffect(() => {
    const updatedNodes: Node[] = scenes.map((scene, index) => ({
      id: scene.id,
      type: 'scene',
      data: { scene, sceneNumber: index + 1 },
      position: { x: scene.position.x, y: scene.position.y },
      style: { width: scene.size.width, height: scene.size.height },
    }))
    setNodes(updatedNodes)
  }, [scenes, setNodes])

  // Synchronize edges with connections from the Redux store
  React.useEffect(() => {
    const updatedEdges: Edge[] = connections.map((conn) => ({
      id: `e${conn.from}-${conn.to}`,
      source: conn.from,
      target: conn.to,
      animated: true,
      type: 'relationship',
    }))
    setEdges(updatedEdges)
  }, [connections, setEdges])

  const onConnectHandler = useCallback(
    (params: Connection) => {
      const { source, target } = params
      if (source && target) {
        dispatch(addConnection({ from: source, to: target, type: 'SCENE_TO_SCENE' }))
        setEdges((eds) => addEdge({ ...params, type: 'relationship' }, eds))
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
        edgeTypes={edgeTypes}
        snapToGrid={true}
        snapGrid={[15, 15]}
        fitView
        connectionLineType={ConnectionLineType.SmoothStep}
      >
        <Background color="#999999" gap={15} />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  )
}

export default PlaygroundCanvas