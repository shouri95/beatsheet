'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Scene = {
  id: number;
  title: string;
  content: string;
  transition?: string;
};

type SceneEditorProps = {
  scene: Scene;
  updateScene: (scene: Scene) => void;
};

const SceneEditor: React.FC<SceneEditorProps> = ({ scene, updateScene }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState(scene.title);
  const [content, setContent] = useState(scene.content);

  const saveChanges = () => {
    updateScene({ ...scene, title, content });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Edit Scene</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Scene</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <input
            type="text"
            className="w-full p-2 border border-gray-300 rounded"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Scene Title"
          />
          <textarea
            className="w-full p-2 border border-gray-300 rounded"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Scene Content"
          />
          <Button onClick={saveChanges}>Save Changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SceneEditor;
