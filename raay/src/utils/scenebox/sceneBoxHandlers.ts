// src/utils/sceneBoxHandlers.ts

import { Dispatch } from 'react';
import { updateScene, deleteScene, addScene } from '../../store/scenesSlice';
import { debounce } from 'lodash';

export const handleTitleChange = (
  e: React.ChangeEvent<HTMLInputElement>,
  setTitle: React.Dispatch<React.SetStateAction<string>>
) => {
  setTitle(e.target.value);
};

export const handleContentChange = (
  e: React.ChangeEvent<HTMLTextAreaElement>,
  setScriptContent: React.Dispatch<React.SetStateAction<string>>
) => {
  setScriptContent(e.target.value);
};

export const handleBlur = (
  title: string,
  scriptContent: string,
  debouncedUpdateScene: (title: string, scriptContent: string) => void
) => {
  debouncedUpdateScene(title, scriptContent);
};

export const handleDelete = (
  dispatch: Dispatch<any>,
  sceneId: string
) => {
  dispatch(deleteScene(sceneId));
};

export const handleEdit = (
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>
) => {
  setIsEditing(true);
};

export const handleCloseEdit = (
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>
) => {
  setIsEditing(false);
};

export const handleUpdateScene = (
  updatedScene: { title: string; scriptContent: string },
  dispatch: Dispatch<any>,
  sceneId: string,
  setTitle: React.Dispatch<React.SetStateAction<string>>,
  setScriptContent: React.Dispatch<React.SetStateAction<string>>,
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>
) => {
  dispatch(updateScene({ id: sceneId, ...updatedScene }));
  setTitle(updatedScene.title);
  setScriptContent(updatedScene.scriptContent);
  setIsEditing(false);
};

export const handleAddCharacter = () => {
  console.log('Add Character');
};

export const handleDuplicate = (
  dispatch: Dispatch<any>,
  scene: any
) => {
  const newScene = { ...scene, id: `scene-${Date.now()}` };
  dispatch(addScene(newScene));
  console.log('Duplicate Scene');
};

export const handleViewDetails = () => {
  console.log('View Details');
};

export const handleAddComment = () => {
  console.log('Add Comment');
};