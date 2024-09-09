'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowRight } from 'lucide-react';

type Scene = {
  id: number;
  title: string;
  content: string;
  transition?: string;
};

type TransitionDialogProps = {
  scene: Scene;
  updateScene: (scene: Scene) => void;
};

const TransitionDialog: React.FC<TransitionDialogProps> = ({ scene, updateScene }) => {
  const updateTransition = (transition: string) => {
    updateScene({ ...scene, transition });
  };

  return (
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
          <Button onClick={() => updateTransition('Cut')}>Cut</Button>
          <Button onClick={() => updateTransition('Fade')}>Fade</Button>
          <Button onClick={() => updateTransition('Dissolve')}>Dissolve</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TransitionDialog;
