// src/components/Playground/SceneBox/SceneBox.tsx

import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  updateScene, 
  assignCharacterToScene, 
  deleteScene, 
  addScene 
} from '../../../store/scenesSlice';
import { RootState } from '../../../store';
import { Tooltip } from '../../Common/Tooltip';
import { UserIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useDrag, useDrop } from 'react-dnd';
import { motion } from 'framer-motion';
import { cn } from '../../../lib/utils';
import ScreenwritingEditor from '../ScreenwritingEditor';
import FloatingToolbox from '../Toolbox/FloatingToolbox';
import { exitConnectionMode } from '../../../store/uiSlice';

interface SceneBoxProps {
  data: {
    scene: {
      id: string;
      title: string;
      scriptContent: string;
      position: { x: number; y: number };
      size: { width: number; height: number };
      characters: string[];
      color: string;
    };
    index: number;
  };
}

const SceneBox: React.FC<SceneBoxProps> = ({ data }) => {
  const dispatch = useDispatch();
  const { scene, index } = data;
  const characters = useSelector((state: RootState) =>
    state.characters.characters.filter(char => scene.characters.includes(char.id))
  );
  const connectionMode = useSelector((state: RootState) => state.ui.connectionMode);

  const [title, setTitle] = useState(scene.title);
  const [scriptContent, setScriptContent] = useState(scene.scriptContent);
  const [isEditing, setIsEditing] = useState(false);

  const ref = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setTitle(scene.title);
    setScriptContent(scene.scriptContent);
  }, [scene.title, scene.scriptContent]);

  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'SCENE',
    item: { id: scene.id, index },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }), [scene.id, index]);

  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'CHARACTER',
    drop: (item: { id: string }) => {
      dispatch(assignCharacterToScene({ sceneId: scene.id, characterId: item.id }))
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }), [scene.id, dispatch]);

  // Combine drag and drop refs
  const dragDropRef = (node: HTMLDivElement | null) => {
    drag(drop(node));
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setScriptContent(e.target.value);
  };

  const handleBlur = () => {
    dispatch(updateScene({ id: scene.id, title, scriptContent }));
  };

  const handleDelete = () => {
    dispatch(deleteScene(scene.id));
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCloseEdit = () => {
    setIsEditing(false);
  };

  const handleUpdateScene = (updatedScene: { title: string; scriptContent: string }) => {
    dispatch(updateScene({ id: scene.id, ...updatedScene }));
    setTitle(updatedScene.title);
    setScriptContent(updatedScene.scriptContent);
    setIsEditing(false);
  };

  // Toolbox action handlers
  const handleConnect = () => {
    // Connection handled via FloatingToolbox and connection mode
    // No action needed here
  };

  const handleAddCharacter = () => {
    // Implement add character functionality, e.g., opening a modal to select/add characters
    console.log('Add Character');
  };

  const handleDuplicate = () => {
    const newScene = { ...scene, id: `scene-${Date.now()}` };
    dispatch(addScene(newScene));
    console.log('Duplicate Scene');
  };

  const handleViewDetails = () => {
    // Implement view details functionality, e.g., opening a detailed view or modal
    console.log('View Details');
  };

  const handleAddComment = () => {
    // Implement add comment functionality, e.g., opening a comments sidebar or modal
    console.log('Add Comment');
  };

  return (
    <>
      <motion.div
        ref={dragDropRef}
        className={cn(
          "relative p-4 rounded-lg shadow-md border border-gray-300 transition-all duration-300 ease-in-out cursor-pointer group",
          isOver ? "border-blue-500 border-2" : "",
          connectionMode.isActive && connectionMode.sourceSceneId === scene.id ? "ring-4 ring-blue-500" : ""
        )}
        style={{
          width: scene.size.width,
          height: scene.size.height,
          opacity: isDragging ? 0.5 : 1,
        }}
        onClick={() => {
          if (connectionMode.isActive && connectionMode.sourceSceneId === scene.id) {
            dispatch(exitConnectionMode());
          }
        }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <FloatingToolbox
          onEdit={handleEdit}
          onDelete={handleDelete}
          onConnect={handleConnect}
          onAddCharacter={handleAddCharacter}
          onDuplicate={handleDuplicate}
          onViewDetails={handleViewDetails}
          onAddComment={handleAddComment}
          sceneId={scene.id}
        />

          <div className="absolute top-0 left-0 right-0 p-2">
          <input
            ref={titleRef}
            type="text"
            value={title}
            onChange={handleTitleChange}
            onBlur={handleBlur}
            className="text-lg font-semibold bg-transparent border-none focus:outline-none focus:ring-0 w-full text-center"
            placeholder="Scene Title"
          />
          <div className="flex space-x-2">
            <Tooltip content="Edit Scene">
              <button
                onClick={handleEdit}
                className="text-gray-500 hover:text-gray-700 transition-colors duration-300"
                aria-label="Edit Scene"
              >
                <PencilIcon className="h-4 w-4" />
              </button>
            </Tooltip>
            <Tooltip content="Delete Scene">
              <button
                onClick={handleDelete}
                className="text-gray-500 hover:text-gray-700 transition-colors duration-300"
                aria-label="Delete Scene"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </Tooltip>
          </div>
        </div>

        <textarea
          ref={contentRef}
          value={scriptContent}
          onChange={handleContentChange}
          onBlur={handleBlur}
          className="w-full h-20 p-2 text-sm bg-transparent border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Describe your scene..."
        />

        <div className="absolute bottom-2 right-2 flex items-center space-x-2">
          <div className="flex -space-x-1">
            {characters.slice(0, 3).map(char => (
              <Tooltip key={char.id} content={char.name}>
                <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center border-2 border-white">
                  <UserIcon className="h-4 w-4 text-blue-600" />
                </div>
              </Tooltip>
            ))}
          </div>
          <span className="text-xs text-gray-500">
            {characters.length} {characters.length === 1 ? 'character' : 'characters'}
          </span>
        </div>
      </motion.div>
      {isEditing && (
        <ScreenwritingEditor
          scene={{ id: scene.id, title, scriptContent }}
          onSave={handleUpdateScene}
          onClose={handleCloseEdit}
        />
      )}
    </>
  );
};

export default SceneBox;