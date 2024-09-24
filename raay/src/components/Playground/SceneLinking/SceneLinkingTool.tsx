// src/components/Playground/SceneLinking/SceneLinkingTool.tsx

import React, { useState, ChangeEvent } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../store';
import { addConnection, ConnectionType } from '../../../store/connectionsSlice';
import { Button } from '../../Common/Button';
import { Select } from '../../Common/Select';

const SceneLinkingTool: React.FC = () => {
  const dispatch = useDispatch();
  const scenes = useSelector((state: RootState) => state.scenes.scenes);

  const [fromScene, setFromScene] = useState('');
  const [toScene, setToScene] = useState('');
  const [connectionType, setConnectionType] = useState<ConnectionType>('SCENE_TO_SCENE');

  const handleAddConnection = () => {
    if (fromScene && toScene && connectionType) {
      dispatch(addConnection({
        from: fromScene,
        to: toScene,
        type: connectionType
      }));
      setFromScene('');
      setToScene('');
      setConnectionType('SCENE_TO_SCENE');
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Scene Linking Tool</h3>
      <div className="space-y-4">
        <Select
          value={fromScene}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setFromScene(e.target.value)}
          options={scenes.map((scene) => ({ value: scene.id, label: scene.title }))}
          placeholder="Select From Scene"
        />
        <Select
          value={toScene}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setToScene(e.target.value)}
          options={scenes.map((scene) => ({ value: scene.id, label: scene.title }))}
          placeholder="Select To Scene"
        />
        <Select
          value={connectionType}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setConnectionType(e.target.value as ConnectionType)}
          options={[
            { value: 'SCENE_TO_SCENE', label: 'Scene to Scene' },
            { value: 'CHARACTER_TO_SCENE', label: 'Character to Scene' },
            { value: 'CHARACTER_TO_CHARACTER', label: 'Character to Character' },
          ]}
          placeholder="Select Connection Type"
        />
        <Button onClick={handleAddConnection} disabled={!fromScene || !toScene || !connectionType}>
          Add Connection
        </Button>
      </div>
    </div>
  );
};

export default SceneLinkingTool;