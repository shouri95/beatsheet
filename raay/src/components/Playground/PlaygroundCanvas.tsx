import React, { useCallback, useState, useEffect } from 'react';
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
import CustomSceneNode from './CustomSceneNode';
import CustomRelationshipEdge from './CustomRelationshipEdge';
import { addConnection, ConnectionType } from '../../store/connectionsSlice';
import { updateScenePosition } from '../../store/scenesSlice';
import ConnectionSummaryModal from './ConnectionSummaryModal';
import { setConnectionMode, setActiveConnectionType } from '../../store/uiSlice';

// Define custom node and edge types for the React Flow canvas
const nodeTypes = {
  scene: CustomSceneNode,
};

const edgeTypes = {
  relationship: CustomRelationshipEdge,
};

const PlaygroundCanvas: React.FC = () => {
  const dispatch = useDispatch();
  // Get scenes, connections, and UI state from the Redux store
  const scenes = useSelector((state: RootState) => state.scenes.scenes);
  const connections = useSelector((state: RootState) => state.connections.connections);
  const connectionMode = useSelector((state: RootState) => state.ui.connectionMode);
  const activeConnectionType = useSelector((state: RootState) => state.ui.activeConnectionType);

  // State for managing nodes and edges in the flow diagram
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // State to manage the visibility of the connections modal and the source scene ID
  const [isConnectionsModalOpen, setIsConnectionsModalOpen] = useState(false);
  const [sourceSceneId, setSourceSceneId] = useState<string | null>(null);

  // Update nodes whenever the scenes change
  useEffect(() => {
    const updatedNodes: Node[] = scenes.map((scene, index) => ({
      id: scene.id,
      type: 'scene',
      data: { scene, index },
      position: scene.position,
      draggable: true,
    }));
    setNodes(updatedNodes);
  }, [scenes, setNodes]);

  // Update edges whenever the connections change
  useEffect(() => {
    const updatedEdges: Edge[] = connections.map((conn) => ({
      id: `e${conn.from}-${conn.to}`,
      source: conn.from,
      target: conn.to,
      animated: true,
      type: 'relationship',
      data: { connectionType: conn.type, label: conn.type.charAt(0).toUpperCase() + conn.type.slice(1) },
    }));
    setEdges(updatedEdges);
  }, [connections, setEdges]);

  // Handle new connections made in the flow diagram
  const onConnect = useCallback(
    (params: Connection) => {
      if (connectionMode && activeConnectionType && params.source && params.target) {
        // Dispatch an action to add the connection to the store
        dispatch(addConnection({
          from: params.source,
          to: params.target,
          type: activeConnectionType as ConnectionType,
        }));
        // Disable connection mode after adding the connection
        dispatch(setConnectionMode(false));
        dispatch(setActiveConnectionType(null));
      }
    },
    [dispatch, connectionMode, activeConnectionType]
  );

  // Handle clicks on nodes in the flow diagram
  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (connectionMode && activeConnectionType) {
        if (!sourceSceneId) {
          // Set the source scene ID if not already set
          setSourceSceneId(node.id);
        } else if (node.id !== sourceSceneId) {
          // If a source scene ID is already set, create a connection
          dispatch(addConnection({
            from: sourceSceneId,
            to: node.id,
            type: activeConnectionType as ConnectionType,
          }));
          // Disable connection mode and reset the source scene ID
          dispatch(setConnectionMode(false));
          dispatch(setActiveConnectionType(null));
          setSourceSceneId(null);
        }
      }
    },
    [dispatch, connectionMode, activeConnectionType, sourceSceneId]
  );

  // Function to open the connections summary modal
  const openConnectionsModal = () => {
    setIsConnectionsModalOpen(true);
  };

  // Function to close the connections summary modal
  const closeConnectionsModal = () => {
    setIsConnectionsModalOpen(false);
  };

  return (
    <>
      {/* DnDProvider is used to enable drag-and-drop functionality in the React Flow canvas */}
      <DndProvider backend={HTML5Backend}>
        <div className="h-full">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            // Update scene position in the store when node drag stops
            onNodeDragStop={(event, node) => dispatch(updateScenePosition({ id: node.id, position: node.position }))}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            snapToGrid={true}
            snapGrid={[15, 15]}
            fitView
            connectionLineType={ConnectionLineType.SmoothStep}
          >
            {/* Background grid for better visualization of the canvas */}
            <Background color="#999999" gap={15} />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>
      </DndProvider>

      {/* Connection summary modal to show all connections */}
      <ConnectionSummaryModal isOpen={isConnectionsModalOpen} onClose={closeConnectionsModal} />

      {/* Overlay to manage connection mode between scenes */}
      {connectionMode && (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-md shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Establishing {activeConnectionType} Connection</h3>
            <p className="mb-4">Click on a scene to {sourceSceneId ? 'complete' : 'start'} the connection.</p>
            <button
              onClick={() => {
                // Cancel connection mode and reset source scene ID
                dispatch(setConnectionMode(false));
                setSourceSceneId(null);
              }}
              className="mt-4 bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
            >
              Cancel Connection Mode
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default PlaygroundCanvas;