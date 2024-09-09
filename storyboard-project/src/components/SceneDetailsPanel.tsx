'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Scene } from "../types";

type SceneDetailsPanelProps = {
  scene: Scene;
  isOpen: boolean;
  onClose: () => void;
  updateScene: (scene: Scene) => void;
};

const SceneDetailsPanel: React.FC<SceneDetailsPanelProps> = ({ scene, isOpen, onClose, updateScene }) => {
  const [title, setTitle] = useState(scene.title);
  const [content, setContent] = useState(scene.content);
  const [notes, setNotes] = useState(scene.notes || '');
  const [duration, setDuration] = useState(scene.duration || 0);

  const saveChanges = () => {
    updateScene({ ...scene, title, content, notes, duration });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Scene Details</DialogTitle>
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
          <textarea
            className="w-full p-2 border border-gray-300 rounded"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Scene Notes"
          />
          <input
            type="number"
            className="w-full p-2 border border-gray-300 rounded"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            placeholder="Scene Duration (mins)"
          />
          <Button onClick={saveChanges}>Save Changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SceneDetailsPanel;
