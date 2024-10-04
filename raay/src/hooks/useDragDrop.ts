// src/utils/useDragDrop.ts

import { useDrag, useDrop } from 'react-dnd';
import { useMemo } from 'react';
import { Dispatch } from 'react';
import { assignCharacterToScene } from '../store/scenesSlice';

const useDragDrop = (item: any, sceneId: string, dispatch: Dispatch<any>) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'SCENE',
    item,
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }), [item]);

  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'CHARACTER',
    drop: (droppedItem: { id: string }) => {
      dispatch(assignCharacterToScene({ sceneId, characterId: droppedItem.id }));
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }), [sceneId, dispatch]);

  const dragDropRef = useMemo(() => (node: HTMLDivElement | null) => {
    drag(drop(node));
  }, [drag, drop]);

  return [dragDropRef, isDragging, isOver] as const;
};

export default useDragDrop;