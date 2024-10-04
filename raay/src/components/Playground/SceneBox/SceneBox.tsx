// src/components/Playground/SceneBox/SceneBox.tsx

"use client"

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
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
import { setConnectionMode } from '../../../store/uiSlice';
import { debounce } from 'lodash';
import { duplicateScene } from './sceneUtils';
import {
  handleTitleChange,
  handleContentChange,
  handleDelete,
  handleEdit,
  handleCloseEdit,
  handleUpdateScene,
  handleAddCharacter,
  handleDuplicate,
  handleViewDetails,
  handleAddComment,
  handleBlur,
} from './sceneBoxHandlers';
import useDragDrop from '../../../hooks/useDragDrop';

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

let sceneCounter = 1;

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
    if (scene.title !== title) {
      setTitle(scene.title);
    }
    if (scene.scriptContent !== scriptContent) {
      setScriptContent(scene.scriptContent);
    }
  }, [scene.title, scene.scriptContent, title, scriptContent]);

  const stableSceneId = useMemo(() => `scene-${index + 1}`, [index]);
  const stableIndex = useMemo(() => index, [index]);

  const memoizedItem = useMemo(() => ({ id: stableSceneId, index: stableIndex }), [stableSceneId, stableIndex]);

  const debouncedUpdateScene = useCallback(
    debounce((updatedTitle: string, updatedScriptContent: string) => {
      dispatch(updateScene({ id: stableSceneId, title: updatedTitle, scriptContent: updatedScriptContent }));
    }, 300),
    [dispatch, stableSceneId]
  );

  const [dragDropRef, isDragging, isOver] = useDragDrop(memoizedItem, stableSceneId, dispatch);

  return (
    <>
      <motion.div
        ref={dragDropRef}
        className={cn(
          "relative p-4 rounded-lg shadow-md border border-gray-300 transition-all duration-300 ease-in-out cursor-pointer group",
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
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.01 }} // Reduced scale
        whileTap={{ scale: 0.99 }} // Reduced scale
      >                         
        <FloatingToolbox
          onEdit={() => handleEdit(setIsEditing)}
          onDelete={() => handleDelete(dispatch, stableSceneId)}
          onAddCharacter={handleAddCharacter}
          onDuplicate={() => handleDuplicate(dispatch, scene)}
          onViewDetails={handleViewDetails}
          onAddComment={handleAddComment}
          sceneId={stableSceneId}
        />

        <div className="absolute top-0 left-0 right-0 p-0">
          <input
            ref={titleRef}
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e, setTitle)}
            onBlur={() => handleBlur(title, scriptContent, debouncedUpdateScene)}
            className="text-lg font-semibold bg-transparent border-none focus:outline-none focus:ring-0 w-full text-center text-clear" // Added text-clear
            placeholder="Scene Title"
          />
        </div>
        <div className="absolute top-9 bottom-5 left-2 right-2">
          <textarea
            ref={contentRef}
            value={scriptContent}
            onChange={(e) => handleContentChange(e, setScriptContent)}
            onBlur={() => handleBlur(title, scriptContent, debouncedUpdateScene)}
            className="w-full h-full p-2 text-sm bg-transparent border-none rounded-md resize-none focus:outline-none focus:ring-0 text-clear" // Added text-clear
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
          scene={{ id: stableSceneId, title, scriptContent }}
          onSave={(updatedScene) => handleUpdateScene(updatedScene, dispatch, stableSceneId, setTitle, setScriptContent, setIsEditing)}
          onClose={() => handleCloseEdit(setIsEditing)}
        />
      )}
    </>
  );
};

export default SceneBox;
