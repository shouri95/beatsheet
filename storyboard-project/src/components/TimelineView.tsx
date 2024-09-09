import React from 'react';
import { Scene } from "../types";
import { motion } from 'framer-motion';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft } from 'lucide-react';

type AdvancedTimelineViewProps = {
  scenes: Scene[];
  updateScenes: (scenes: Scene[]) => void;
  openDetails: (scene: Scene) => void;
};

const AdvancedTimelineView: React.FC<AdvancedTimelineViewProps> = ({ scenes, updateScenes, openDetails }) => {
  const [currentIndex, setCurrentIndex] = React.useState(0);

  const nextScene = () => {
    if (currentIndex < scenes.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const prevScene = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const getSceneColor = (scene: Scene) => {
    if (scene.duration > 5) return 'bg-red-200 dark:bg-red-800';
    if (scene.notes.includes('emotional')) return 'bg-yellow-200 dark:bg-yellow-800';
    if (scene.notes.includes('dialogue')) return 'bg-blue-200 dark:bg-blue-800';
    return 'bg-gray-200 dark:bg-gray-800';
  };

  return (
    <div className="relative w-full py-12">
      <div className="absolute left-0 right-0 top-1/2 h-1 bg-gray-300 dark:bg-gray-700 transform -translate-y-1/2" />
      <div className="flex justify-between items-center">
        <Button onClick={prevScene} disabled={currentIndex === 0} size="icon" variant="outline">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 px-4">
          <motion.div
            className="flex"
            animate={{ x: `${-currentIndex * 100}%` }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {scenes.map((scene, index) => (
              <Card
                key={scene.id}
                className={`flex-shrink-0 w-full mx-2 cursor-pointer transition-all duration-300 ${
                  index === currentIndex ? 'scale-105 shadow-lg' : 'scale-95 opacity-50'
                } ${getSceneColor(scene)}`}
                onClick={() => openDetails(scene)}
              >
                <CardContent className="p-4">
                  <h3 className="font-bold text-lg mb-2">{scene.title}</h3>
                  <p className="text-sm mb-2">{scene.content.substring(0, 100)}...</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Duration: {scene.duration} mins</p>
                </CardContent>
              </Card>
            ))}
          </motion.div>
        </div>
        <Button onClick={nextScene} disabled={currentIndex === scenes.length - 1} size="icon" variant="outline">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default AdvancedTimelineView;