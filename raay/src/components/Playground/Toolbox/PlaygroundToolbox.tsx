import React from 'react';
import { useDispatch } from 'react-redux';
import { addScene } from '../../../store/scenesSlice';
import { addCharacter } from '../../../store/charactersSlice';
import { addProp } from '../../../store/propsSlice';
import { v4 as uuidv4 } from 'uuid';
import styles from './PlaygroundToolbox.module.css';
import { 
  CubeIcon, 
  UserPlusIcon, 
  CubeIcon as PropIcon, 
  ArrowPathIcon, 
  LinkIcon 
} from '@heroicons/react/24/outline';

const PlaygroundToolbox: React.FC = () => {
  const dispatch = useDispatch();

  const handleAddScene = () => {
    const newScene = {
      id: uuidv4(),
      title: `Scene ${uuidv4().slice(0, 4)}`,
      scriptContent: '',
      position: { x: Math.random() * 500, y: Math.random() * 500 },
      size: { width: 250, height: 150 },
      characters: [],
      color: 'bg-white',
    };
    dispatch(addScene(newScene));
  };

  const handleAddCharacter = () => {
    const newCharacter = {
      id: uuidv4(),
      name: `Character ${uuidv4().slice(0, 4)}`,
      description: '',
    };
    dispatch(addCharacter(newCharacter));
  };

  const handleAddProp = () => {
    const newProp = {
      id: uuidv4(),
      name: `Prop ${uuidv4().slice(0, 4)}`,
      description: '',
    };
    dispatch(addProp(newProp));
  };

  const handleAddTransition = () => {
    console.log('Add Transition clicked. Feature not implemented yet.');
  };

  const handleAddConnection = () => {
    console.log('Add Connection clicked. Feature not implemented yet.');
  };

  return (
    <div className={styles.toolbox}>
      <ToolboxButton icon={CubeIcon} onClick={handleAddScene} tooltip="Add Scene" />
      <ToolboxButton icon={UserPlusIcon} onClick={handleAddCharacter} tooltip="Add Character" />
      <ToolboxButton icon={PropIcon} onClick={handleAddProp} tooltip="Add Prop" />
      <ToolboxButton icon={ArrowPathIcon} onClick={handleAddTransition} tooltip="Add Transition" />
      <ToolboxButton icon={LinkIcon} onClick={handleAddConnection} tooltip="Add Connection" />
    </div>
  );
};

interface ToolboxButtonProps {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  onClick: () => void;
  tooltip: string;
}

const ToolboxButton: React.FC<ToolboxButtonProps> = ({ icon: Icon, onClick, tooltip }) => (
  <button onClick={onClick} className={styles.button} title={tooltip}>
    <Icon className={styles.icon} />
  </button>
);

export default PlaygroundToolbox;