'use client'

import React, { useState } from 'react';
import SceneCard from "../components/SceneCard";
import SceneDetailsPanel from "../components/SceneDetailsPanel";
import AdvancedTimelineView from "../components/AdvancedTimelineView";
import { Scene } from "../types";
import { Button } from '@/components/ui/button';
import ScriptEditor from '@/components/ScriptEditor';
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, Undo, Redo } from 'lucide-react';


// Initial scenes data
const initialScenes: Scene[] = [
  { id: 1, title: "Opening Sequence", content: "Black screen, voiceover, cut to Perth street", duration: 2, notes: '', transition: '' },
  { id: 2, title: "Arjun's House - Night", content: "Exterior shot of suburban house", duration: 3, notes: '', transition: '' },
  { id: 3, title: "Arjun's Room - Night", content: "Arjun listening to music, experiences pain", duration: 5, notes: '', transition: '' },
  {
    id: 4, title: "Dream Sequence", content: "Serene garden, mother's voice, chaos",
    notes: '',
    duration: 0
  },
  {
    id: 5, title: "Arjun's Bedroom - Day", content: "Arjun wakes up on floor",
    notes: '',
    duration: 0
  },
  {
    id: 6, title: "Arjun's Kitchen - Morning", content: "Arjun cooking, experiences anxiety",
    notes: '',
    duration: 0
  },
  {
    id: 7, title: "Arjun's Bedroom - Morning", content: "Arjun rushes to room, loses consciousness",
    notes: '',
    duration: 0
  },
  {
    id: 8, title: "Montage Sequence", content: "Arjun's journey to find answers",
    notes: '',
    duration: 0
  },
  {
    id: 9, title: "Arjun's Bedroom - Night", content: "Arjun in despair, passes out",
    notes: '',
    duration: 0
  },
  {
    id: 10, title: "Arjun's Bedroom - Night", content: "Vision of mother, revelation of powers",
    notes: '',
    duration: 0
  },
  {
    id: 11, title: "Closing Sequence", content: "Fade to white, Arjun's realization",
    notes: '',
    duration: 0
  },
];

const StoryboardComponent: React.FC = () => {
  const [scenes, setScenes] = useState<Scene[]>(initialScenes);
  const [draggedScene, setDraggedScene] = useState<Scene | null>(null);
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null);
  const [history, setHistory] = useState<Scene[][]>([initialScenes]);
  const [historyIndex, setHistoryIndex] = useState(0);


  const onDragStart = (e: React.DragEvent<HTMLDivElement>, scene: Scene) => {
    setDraggedScene(scene);
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>, targetIndex: number) => {
    e.preventDefault();
    if (draggedScene) {
      const newScenes = scenes.filter(scene => scene.id !== draggedScene.id);
      newScenes.splice(targetIndex, 0, draggedScene);
      setScenes(newScenes);
      saveToHistory(newScenes);
    }
    setDraggedScene(null);
  };

  const removeScene = (sceneId: number) => {
    const newScenes = scenes.filter(scene => scene.id !== sceneId);
    setScenes(newScenes);
    saveToHistory(newScenes);
  };

  const updateScene = (updatedScene: Scene) => {
    const newScenes = scenes.map(scene => scene.id === updatedScene.id ? updatedScene : scene);
    setScenes(newScenes);
    saveToHistory(newScenes);
  };

  const openDetails = (scene: Scene) => {
    setSelectedScene(scene);
  };

  const closeDetails = () => {
    setSelectedScene(null);
  };

  const saveToHistory = (newScenes: Scene[]) => {
    const newHistory = [...history.slice(0, historyIndex + 1), newScenes];
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setScenes(history[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setScenes(history[historyIndex + 1]);
    }
  };

  const totalDuration = scenes.reduce((sum, scene) => sum + (scene.duration || 0), 0);

  const addNewScene = () => {
    const newScene: Scene = {
      id: scenes.length + 1,
      title: `New Scene ${scenes.length + 1}`,
      content: "Add your scene content here...",
      duration: 0,
      notes: '',
      transition: ''
    };
    const newScenes = [...scenes, newScene];
    setScenes(newScenes);
    saveToHistory(newScenes);
  };

  const totalDuration = scenes.reduce((sum, scene) => sum + (scene.duration || 0), 0);

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen p-6">
      <h1 className="text-3xl font-bold mb-8 text-center text-gray-900 dark:text-white">Interactive Storyboard</h1>
      
      <Tabs defaultValue="storyboard" className="w-full mb-8">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="storyboard">Storyboard</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="script">Script</TabsTrigger>
        </TabsList>
        <TabsContent value="storyboard">
          <div className="flex flex-wrap justify-center gap-6 overflow-x-auto pb-8">
            {scenes.map((scene, index) => (
              <SceneCard
                key={scene.id}
                scene={scene}
                index={index}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDrop={onDrop}
                removeScene={removeScene}
                openDetails={openDetails}
              />
            ))}
            <Card className="flex items-center justify-center w-64 h-64 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" onClick={addNewScene}>
              <CardContent>
                <PlusCircle className="w-12 h-12 text-gray-400" />
                <p className="mt-2 text-gray-500">Add New Scene</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="timeline">
          <AdvancedTimelineView scenes={scenes} updateScenes={setScenes} openDetails={openDetails} />
        </TabsContent>
        <TabsContent value="script">
          <ScriptEditor />
        </TabsContent>
      </Tabs>
      
      {selectedScene && (
        <SceneDetailsPanel
          scene={selectedScene}
          isOpen={!!selectedScene}
          onClose={closeDetails}
          updateScene={updateScene}
        />
      )}
      
      <div className="flex justify-between items-center mt-4">
        <div className="flex space-x-2">
          <Button onClick={undo} disabled={historyIndex === 0} variant="outline" size="icon">
            <Undo className="h-4 w-4" />
          </Button>
          <Button onClick={redo} disabled={historyIndex === history.length - 1} variant="outline" size="icon">
            <Redo className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-gray-700 dark:text-gray-300">Total Duration: {totalDuration} mins</p>
      </div>
    </div>
  );
};

export default StoryboardComponent;
