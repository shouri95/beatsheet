// src/components/Playground/PlaygroundCanvas.tsx

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
import ConnectionSummary from './ConnectionSummary';
import ConnectionSummaryModal from './ConnectionSummaryModal';
import { setConnectionMode, setActiveConnectionType } from '../../store/uiSlice';

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
  const connectionMode = useSelector((state: RootState) => state.ui.connectionMode);
  const activeConnectionType = useSelector((state: RootState) => state.ui.activeConnectionType);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const [isConnectionsModalOpen, setIsConnectionsModalOpen] = useState(false);
  const [sourceSceneId, setSourceSceneId] = useState<string | null>(null);

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

  const onConnect = useCallback(
    (params: Connection) => {
      if (connectionMode && activeConnectionType && params.source && params.target) {
        dispatch(addConnection({
          from: params.source,
          to: params.target,
          type: activeConnectionType as ConnectionType,
        }));
        dispatch(setConnectionMode(false));
        dispatch(setActiveConnectionType(null));
      }
    },
    [dispatch, connectionMode, activeConnectionType]
  );

  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (connectionMode && activeConnectionType) {
        if (!sourceSceneId) {
          setSourceSceneId(node.id);
        } else if (node.id !== sourceSceneId) {
          dispatch(addConnection({
            from: sourceSceneId,
            to: node.id,
            type: activeConnectionType as ConnectionType,
          }));
          dispatch(setConnectionMode(false));
          dispatch(setActiveConnectionType(null));
          setSourceSceneId(null);
        }
      }
    },
    [dispatch, connectionMode, activeConnectionType, sourceSceneId]
  );

  const openConnectionsModal = () => {
    setIsConnectionsModalOpen(true);
  };

  const closeConnectionsModal = () => {
    setIsConnectionsModalOpen(false);
  };

  return (
    <>
      <DndProvider backend={HTML5Backend}>
        <div className="h-full">
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

      <ConnectionSummaryModal isOpen={isConnectionsModalOpen} onClose={closeConnectionsModal} />

      {connectionMode && (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-md shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Establishing {activeConnectionType} Connection</h3>
            <p className="mb-4">Click on a scene to {sourceSceneId ? 'complete' : 'start'} the connection.</p>
            <button
              onClick={() => {
                dispatch(setConnectionMode(false));
                dispatch(setActiveConnectionType(null));
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