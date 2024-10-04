// src/components/Playground/PlaygroundCanvas.tsx

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
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
  ReactFlowInstance,
  Viewport,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import SceneBox from './SceneBox/SceneBox';
import PlaygroundToolbox from './Toolbox/PlaygroundToolbox';
import { addConnection } from '../../store/connectionsSlice';
import { createSelector } from '@reduxjs/toolkit';

const nodeTypes = {
  scene: SceneBox,
};

const selectScenes = (state: RootState) => state.scenes.scenes;
const memoizedScenesSelector = createSelector(selectScenes, (scenes) => scenes);

const PlaygroundCanvas: React.FC = () => {
  const dispatch = useDispatch();
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);
  const viewportRef = useRef<Viewport | null>(null);
  
  const scenes = useSelector(memoizedScenesSelector);
  const connections = useSelector((state: RootState) => state.connections.connections);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const updateNodesWithoutChangingViewport = useCallback((newNodes: Node[]) => {
    if (reactFlowInstance.current && viewportRef.current) {
      setNodes(newNodes);
      // Use a setTimeout to ensure the viewport is set after React has updated the DOM
      setTimeout(() => {
        reactFlowInstance.current?.setViewport(viewportRef.current!);
      }, 0);
    } else {
      setNodes(newNodes);
    }
  }, [setNodes]);

  useEffect(() => {
    const uniqueScenes = scenes.filter((scene, index, self) =>
      index === self.findIndex((t) => t.id === scene.id)
    );
    const updatedNodes: Node[] = uniqueScenes.map((scene) => ({
      id: scene.id,
      type: 'scene',
      data: { scene },
      position: scene.position,
      draggable: true,
    }));
    console.log('Updating nodes:', updatedNodes);
    updateNodesWithoutChangingViewport(updatedNodes);
  }, [scenes, updateNodesWithoutChangingViewport]);

  useEffect(() => {
    const updatedEdges: Edge[] = connections.map((conn) => ({
      id: `e${conn.from}-${conn.to}`,
      source: conn.from,
      target: conn.to,
      animated: true,
      type: 'default',
      data: { connectionType: conn.type, label: conn.type.charAt(0).toUpperCase() + conn.type.slice(1) },
    }));
    setEdges(updatedEdges);
  }, [connections, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target) {
        const updatedEdges = addEdge(params, edges);
        setEdges(updatedEdges);

        dispatch(addConnection({
          from: params.source,
          to: params.target,
          type: 'sequential',
        }));
      }
    },
    [dispatch, edges, setEdges]
  );

  const onInit = useCallback((instance: ReactFlowInstance) => {
    reactFlowInstance.current = instance;
    viewportRef.current = instance.getViewport();
  }, []);

  const onMoveEnd = useCallback((event: any, viewport: Viewport) => {
    viewportRef.current = viewport;
  }, []);

  useEffect(() => {
    console.log('Scenes updated:', scenes.map(scene => ({ id: scene.id, title: scene.title })));
  }, [scenes]);

  return (
    <DndProvider backend={HTML5Backend}>
      <div style={{ width: '100%', height: '100vh' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          snapToGrid={true}
          snapGrid={[15, 15]}
          onInit={onInit}
          onMoveEnd={onMoveEnd}
          connectionLineType={ConnectionLineType.SmoothStep}
          fitView={false}
        >
          <Background color="#999999" gap={15} />
          <Controls />
          <MiniMap />
          <PlaygroundToolbox />
        </ReactFlow>
      </div>
    </DndProvider>
  );
};

export default PlaygroundCanvas;