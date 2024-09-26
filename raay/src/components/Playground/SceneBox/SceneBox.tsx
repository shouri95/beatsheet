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
import { UserIcon } from '@heroicons/react/24/outline';
import { useDrag, useDrop } from 'react-dnd';
import { motion } from 'framer-motion';
import { cn } from '../../../lib/utils';
import ScreenwritingEditor from '../ScreenwritingEditor';
import FloatingToolbox from '../Toolbox/FloatingToolbox';
import { setConnectionMode } from '../../../store/uiSlice';

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
    console.log('Add Character');
  };

  const handleDuplicate = () => {
    const newScene = { ...scene, id: `scene-${Date.now()}` };
    dispatch(addScene(newScene));
    console.log('Duplicate Scene');
  };

  const handleViewDetails = () => {
    console.log('View Details');
  };

  const handleAddComment = () => {
    console.log('Add Comment');
  };

  return (
    <>
      <motion.div
        ref={dragDropRef}
        className={cn(
          "relative p-4 rounded-lg shadow-md border border-gray-300 cursor-pointer",
          isOver ? "border-blue-500 border-2" : "",
          connectionMode ? "ring-4 ring-blue-500" : ""
        )}
        style={{
          width: scene.size.width,
          height: scene.size.height,
          opacity: isDragging ? 0.5 : 1,
        }}
        onClick={() => {
          if (connectionMode) {
            dispatch(setConnectionMode(false));
          }
        }}
        whileHover={{ scale: 1.02 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
      >
        <FloatingToolbox
          onEdit={handleEdit}
          onDelete={handleDelete}
          onAddCharacter={handleAddCharacter}
          onDuplicate={handleDuplicate}
          onViewDetails={handleViewDetails}
          onAddComment={handleAddComment}
          sceneId={scene.id}
        />

        <div className="absolute top-0 left-0 right-0 p-0">
          <input
            ref={titleRef}
            type="text"
            value={title}
            onChange={handleTitleChange}
            onBlur={handleBlur}
            className="text-lg font-semibold bg-transparent border-none focus:outline-none focus:ring-0 w-full text-center"
            placeholder="Scene Title"
          />
        </div>
        <div className="absolute top-9 bottom-5 left-2 right-2">
          <textarea
            ref={contentRef}
            value={scriptContent}
            onChange={handleContentChange}
            onBlur={handleBlur}
            className="w-full h-full p-2 text-sm bg-transparent border-none rounded-md resize-none focus:outline-none focus:ring-0"
            placeholder="Describe your scene..."
          />
        </div>

        <div className="absolute bottom-0 right-2 flex items-center space-x-2">
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