// src/components/Playground/PlaygroundCanvas.tsx

import React, { useCallback, useEffect } from 'react';
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
} from 'reactflow';
import 'reactflow/dist/style.css';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import SceneBox from './SceneBox/SceneBox'; // Ensure SceneBox is correctly imported
import PlaygroundToolbox from './Toolbox/PlaygroundToolbox'; // Import the Playground Toolbox
import { addConnection } from '../../store/connectionsSlice'; // Import addConnection from connectionsSlice

// Define custom node types to use SceneBox
const nodeTypes = {
  scene: SceneBox,
};

const PlaygroundCanvas: React.FC = () => {
  const dispatch = useDispatch();
  
  // Retrieve scenes and connections from the Redux store
  const scenes = useSelector((state: RootState) => state.scenes.scenes);
  const connections = useSelector((state: RootState) => state.connections.connections);

  // Manage nodes and edges state using React Flow hooks
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Update nodes whenever scenes change
  useEffect(() => {
    const updatedNodes: Node[] = scenes.map((scene, index) => ({
      id: scene.id,
      type: 'scene', // Custom node type using SceneBox
      data: { scene, index },
      position: scene.position,
      draggable: true,
    }));
    setNodes(updatedNodes);
  }, [scenes, setNodes]);

  // Update edges whenever connections change
  useEffect(() => {
    const updatedEdges: Edge[] = connections.map((conn) => ({
      id: `e${conn.from}-${conn.to}`,
      source: conn.from,
      target: conn.to,
      animated: true,
      type: 'default', // Using React Flow's default edge type
      data: { connectionType: conn.type, label: conn.type.charAt(0).toUpperCase() + conn.type.slice(1) },
    }));
    setEdges(updatedEdges);
  }, [connections, setEdges]);

  // Handle new connections
  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target) {
        // Create the new edge and update React Flow's edge state
        const updatedEdges = addEdge(params, edges);
        setEdges(updatedEdges);

        // Dispatch the addConnection action to update Redux store
        dispatch(addConnection({
          from: params.source,
          to: params.target,
          type: 'sequential', // Assigning a default connection type
        }));
      }
    },
    [dispatch, edges, setEdges]
  );

  // Handle node clicks (No connection mode logic as it's removed)
  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      // No specific action on node click
    },
    []
  );

  return (
    <>
      {/* Enable drag-and-drop functionality within React Flow */}
      <DndProvider backend={HTML5Backend}>
        <div className="h-full">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes} // Use custom node types with SceneBox
            // Removed edgeTypes as custom relationship edges are deleted
            snapToGrid={true}
            snapGrid={[15, 15]}
            fitView
            connectionLineType={ConnectionLineType.SmoothStep}
          >
            {/* Background grid for better visualization */}
            <Background color="#999999" gap={15} />
            <Controls />
            <MiniMap />
            {/* Integrate the PlaygroundToolbox for additional functionalities */}
            <PlaygroundToolbox />
          </ReactFlow>
        </div>
      </DndProvider>

      {/* Removed ConnectionSummaryModal and ToneMeter components */}
    </>
  );
};

export default PlaygroundCanvas;
