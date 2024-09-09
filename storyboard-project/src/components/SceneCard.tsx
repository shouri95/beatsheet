import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Edit2, Clock } from 'lucide-react';
import { Scene } from '../types';

type SceneCardProps = {
  scene: Scene;
  index: number;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, scene: Scene) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
  removeScene: (sceneId: number) => void;
  openDetails: (scene: Scene) => void;
};

const SceneCard: React.FC<SceneCardProps> = ({ scene, index, onDragStart, onDragOver, onDrop, removeScene, openDetails }) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      transition={{ duration: 0.3 }}
      className="w-64"
      draggable
      onDragStart={(e) => onDragStart(e, scene)}
      onDragOver={(e) => onDragOver(e)}
      onDrop={(e) => onDrop(e, index)}
    >
      <Card className="h-full flex flex-col">
        <CardContent className="flex-grow p-4">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-bold text-lg">{scene.title}</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                removeScene(scene.id);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{scene.content.substring(0, 100)}...</p>
          {scene.notes && (
            <p className="text-xs text-gray-500 dark:text-gray-400 italic mb-2">{scene.notes}</p>
          )}
          {scene.transition && (
            <p className="text-xs text-gray-500 dark:text-gray-400 italic">Transition: {scene.transition}</p>
          )}
        </CardContent>
        <CardFooter className="bg-gray-100 dark:bg-gray-800 p-2 flex justify-between items-center">
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <Clock className="h-4 w-4 mr-1" />
            {scene.duration} mins
          </div>
          <Button variant="ghost" size="sm" onClick={() => openDetails(scene)}>
            <Edit2 className="h-4 w-4 mr-1" />
            Edit
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default SceneCard;