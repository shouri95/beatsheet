// src/components/Playground/PlaygroundCanvas.tsx

import React, { useCallback, useState } from 'react';
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
import { addConnection } from '../../store/connectionsSlice';
import { updateScenePosition, assignCharacterToScene } from '../../store/scenesSlice';
import ConnectionSummary from './ConnectionSummary';
import ConnectionSummaryModal from './ConnectionSummaryModal';
import ConnectionTypeToolbox from './ConnectionTypeToolbox';

const nodeTypes = {
  scene: CustomSceneNode,
};

const edgeTypes = {
  relationship: CustomRelationshipEdge,
};

const PlaygroundCanvas: React.FC = () => {
  const dispatch = useDispatch();
  const scenes = useSelector((state: RootState) => state.scenes.scenes);
  const connections = useSelector((state: RootState) => state.connections.connections);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const [isConnectionsModalOpen, setIsConnectionsModalOpen] = useState(false);
  const [isConnectionMode, setIsConnectionMode] = useState(false);
  const [selectedConnectionType, setSelectedConnectionType] = useState<string | null>(null);
  const [sourceSceneId, setSourceSceneId] = useState<string | null>(null);

  React.useEffect(() => {
    const updatedNodes: Node[] = scenes.map((scene, index) => ({
      id: scene.id,
      type: 'scene',
      data: { scene, index },
      position: scene.position,
      draggable: true,
    }));
    setNodes(updatedNodes);
  }, [scenes, setNodes]);

  React.useEffect(() => {
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

  const onConnect = useCallback(
    (params: Connection) => {
      setSourceSceneId(params.source);
      setIsConnectionMode(true);
    },
    []
  );

  const handleSelectConnectionType = (type: string) => {
    if (sourceSceneId && selectedConnectionType) {
      // Logic to handle connection with selected type
    }
  };

  const handleConnectionTypeSelect = (type: string) => {
    if (sourceSceneId) {
      setSelectedConnectionType(type);
      // Wait for user to select target scene
    }
  };

  const handleSceneClick = (sceneId: string) => {
    if (isConnectionMode && selectedConnectionType && sourceSceneId) {
      if (sceneId !== sourceSceneId) {
        dispatch(
          addConnection({
            from: sourceSceneId,
            to: sceneId,
            type: selectedConnectionType as any,
          })
        );

        setEdges((eds) =>
          addEdge(
            {
              id: `e${sourceSceneId}-${sceneId}`,
              source: sourceSceneId,
              target: sceneId,
              type: 'relationship',
              animated: true,
              data: {
                connectionType: selectedConnectionType,
                label: selectedConnectionType.charAt(0).toUpperCase() + selectedConnectionType.slice(1),
              },
            },
            eds
          )
        );
      }
      // Reset connection mode
      setIsConnectionMode(false);
      setSelectedConnectionType(null);
      setSourceSceneId(null);
    }
  };

  const openConnectionsModal = () => {
    setIsConnectionsModalOpen(true);
  };

  const closeConnectionsModal = () => {
    setIsConnectionsModalOpen(false);
  };

  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    handleSceneClick(node.id);
  };

  return (
    <>
      <DndProvider backend={HTML5Backend}>
        <div className="h-full" onDrop={(e) => { /* Existing drop handler */ }} onDragOver={(e) => { /* Existing dragOver handler */ }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDragStop={(event, node) => dispatch(updateScenePosition({ id: node.id, position: node.position }))}
            onNodeClick={onNodeClick}
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

      {/* Connections Summary Modal */}
      <ConnectionSummaryModal isOpen={isConnectionsModalOpen} onClose={closeConnectionsModal} />

      {/* Connection Mode Overlay */}
      {isConnectionMode && selectedConnectionType && (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-md shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Select Target Scene</h3>
            <p className="mb-4">Click on a scene to establish a <span className="font-bold">{selectedConnectionType}</span> connection.</p>
            <button
              onClick={() => {
                setIsConnectionMode(false);
                setSelectedConnectionType(null);
                setSourceSceneId(null);
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default PlaygroundCanvas;