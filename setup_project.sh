#!/bin/bash

# Create Next.js project
npx create-next-app@latest storyboard-project --typescript --eslint --tailwind --app --src-dir --import-alias "@/*"

# Navigate to project directory
cd storyboard-project

# Install additional dependencies
npm install lucide-react @radix-ui/react-dialog @radix-ui/react-slot class-variance-authority clsx tailwind-merge

# Install shadcn/ui CLI
npm install -D @shadcn/ui

# Initialize shadcn/ui
npx shadcn-ui init

# Add necessary components
npx shadcn-ui add button dialog

# Create necessary directories
mkdir -p src/components/ui

# Create StoryboardComponent.tsx
cat << EOF > src/components/StoryboardComponent.tsx
import React, { useState } from 'react';
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ArrowRight, X } from 'lucide-react';

// Scene type definition
type Scene = {
  id: number;
  title: string;
  content: string;
  transition?: string;
};

// Initial scenes data
const initialScenes: Scene[] = [
  { id: 1, title: "Opening Sequence", content: "Black screen, voiceover, cut to Perth street" },
  { id: 2, title: "Arjun's House - Night", content: "Exterior shot of suburban house" },
  { id: 3, title: "Arjun's Room - Night", content: "Arjun listening to music, experiences pain" },
  { id: 4, title: "Dream Sequence", content: "Serene garden, mother's voice, chaos" },
  { id: 5, title: "Arjun's Bedroom - Day", content: "Arjun wakes up on floor" },
  { id: 6, title: "Arjun's Kitchen - Morning", content: "Arjun cooking, experiences anxiety" },
  { id: 7, title: "Arjun's Bedroom - Morning", content: "Arjun rushes to room, loses consciousness" },
  { id: 8, title: "Montage Sequence", content: "Arjun's journey to find answers" },
  { id: 9, title: "Arjun's Bedroom - Night", content: "Arjun in despair, passes out" },
  { id: 10, title: "Arjun's Bedroom - Night", content: "Vision of mother, revelation of powers" },
  { id: 11, title: "Closing Sequence", content: "Fade to white, Arjun's realization" },
];

const StoryboardComponent: React.FC = () => {
  const [scenes, setScenes] = useState<Scene[]>(initialScenes);
  const [draggedScene, setDraggedScene] = useState<Scene | null>(null);

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
    }
    setDraggedScene(null);
  };

  const removeScene = (sceneId: number) => {
    setScenes(scenes.filter(scene => scene.id !== sceneId));
  };

  const updateTransition = (sceneId: number, transition: string) => {
    setScenes(scenes.map(scene => 
      scene.id === sceneId ? { ...scene, transition } : scene
    ));
  };

  return (
    <div className="p-4 bg-gray-100 min-h-screen overflow-x-auto">
      <h1 className="text-2xl font-bold mb-4">Interactive Storyboard</h1>
      <div className="flex space-x-4">
        {scenes.map((scene, index) => (
          <div key={scene.id} className="flex flex-col items-center">
            <div
              className="bg-white p-4 rounded shadow-md w-64 cursor-move mb-2"
              draggable
              onDragStart={(e) => onDragStart(e, scene)}
              onDragOver={onDragOver}
              onDrop={(e) => onDrop(e, index)}
            >
              <div className="flex justify-between items-center mb-2">
                <h2 className="font-semibold">{scene.title}</h2>
                <Button variant="ghost" size="icon" onClick={() => removeScene(scene.id)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm">{scene.content}</p>
            </div>
            {index < scenes.length - 1 && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="icon">
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Set Transition</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <Button onClick={() => updateTransition(scene.id, 'Cut')}>Cut</Button>
                    <Button onClick={() => updateTransition(scene.id, 'Fade')}>Fade</Button>
                    <Button onClick={() => updateTransition(scene.id, 'Dissolve')}>Dissolve</Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            {scene.transition && (
              <p className="text-sm text-gray-500 mt-1">{scene.transition}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default StoryboardComponent;
EOF

# Update page.tsx
cat << EOF > src/app/page.tsx
import StoryboardComponent from '@/components/StoryboardComponent'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <StoryboardComponent />
    </main>
  )
}
EOF

echo "Setup complete. Navigate to the project directory and run 'npm run dev' to start the development server."