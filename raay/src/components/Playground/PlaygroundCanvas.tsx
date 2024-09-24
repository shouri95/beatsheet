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
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import CustomSceneNode from './CustomSceneNode'
import CustomRelationshipEdge from './CustomRelationshipEdge'
import { addConnection } from '../../store/connectionsSlice'
import { updateScenePosition, assignCharacterToScene } from '../../store/scenesSlice'

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

  React.useEffect(() => {
    const updatedNodes: Node[] = scenes.map((scene, index) => ({
      id: scene.id,
      type: 'scene',
      data: { scene, index },
      position: scene.position,
      draggable: true,
    }))
    setNodes(updatedNodes)
  }, [scenes, setNodes])

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

  const onConnect = useCallback(
    (params: Connection) => {
      const { source, target } = params
      if (source && target) {
        dispatch(addConnection({ from: source, to: target, type: 'SCENE_TO_SCENE' }))
        setEdges((eds) => addEdge({ ...params, type: 'relationship' }, eds))
      }
    },
    [dispatch, setEdges]
  )

  const onNodeDragStop = useCallback(
    (event: React.MouseEvent, node: Node) => {
      dispatch(updateScenePosition({ id: node.id, position: node.position }))
    },
    [dispatch]
  )

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()

      const type = event.dataTransfer.getData('application/reactflow')

      if (type === 'CHARACTER') {
        const characterId = event.dataTransfer.getData('character/id')
        const target = event.target as HTMLElement
        const sceneElement = target.closest('.react-flow__node')
        
        if (sceneElement) {
          const sceneId = sceneElement.getAttribute('data-id')

          if (characterId && sceneId) {
            dispatch(assignCharacterToScene({ sceneId, characterId }))
          }
        }  
      }
    },
    [dispatch]
  )

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-full" onDrop={onDrop} onDragOver={onDragOver}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStop={onNodeDragStop}
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
    </DndProvider>
  )
}

export default PlaygroundCanvas