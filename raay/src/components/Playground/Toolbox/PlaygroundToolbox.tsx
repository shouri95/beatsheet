import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { addScene } from '../../../store/scenesSlice';
import { addCharacter } from '../../../store/charactersSlice';
import { addProp } from '../../../store/propsSlice';
import { PlusCircleIcon, UserIcon, FilmIcon, LinkIcon, ArrowsRightLeftIcon } from '@heroicons/react/24/outline';

const PlaygroundToolbox: React.FC = () => {
  const dispatch = useDispatch();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleAddScene = () => {
    dispatch(addScene({
      id: Math.random().toString(36).substr(2, 9),
      title: 'New Scene',
      scriptContent: '',
      characters: [],
      color: 'default',
      position: { x: 100, y: 100 },
      size: { width: 200, height: 150 },
    }));
  };

  const handleAddCharacter = () => {
    dispatch(addCharacter({
      id: Math.random().toString(36).substr(2, 9),
      name: 'New Character',
      description: '',
    }));
  };

  const handleAddProp = () => {
    dispatch(addProp({
      id: Math.random().toString(36).substr(2, 9),
      name: 'New Prop',
      description: '',
    }));
  };

  return (
    <div
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      className={`fixed top-1/2 left-4 transform -translate-y-1/2 z-20 bg-gray-800 p-2 rounded-md shadow-lg transition-all duration-300 ${
        isExpanded ? 'w-48' : 'w-12'
      }`}
    >
      <div className="flex items-center space-x-2">
        <PlusCircleIcon
          className="h-8 w-8 text-white cursor-pointer hover:text-green-400"
          onClick={handleAddScene}
          title="Add Scene"
        />
        {isExpanded && <span className="text-white">Add Scene</span>}
      </div>
      <div className="flex items-center space-x-2 mt-2">
        <UserIcon
          className="h-8 w-8 text-white cursor-pointer hover:text-blue-400"
          onClick={handleAddCharacter}
          title="Add Character"
        />
        {isExpanded && <span className="text-white">Add Character</span>}
      </div>
      <div className="flex items-center space-x-2 mt-2">
        <FilmIcon
          className="h-8 w-8 text-white cursor-pointer hover:text-yellow-400"
          onClick={handleAddProp}
          title="Add Prop"
        />
        {isExpanded && <span className="text-white">Add Prop</span>}
      </div>
      <div className="flex items-center space-x-2 mt-2">
        <ArrowsRightLeftIcon
          className="h-8 w-8 text-white cursor-pointer hover:text-purple-400"
          title="Add Transition"
        />
        {isExpanded && <span className="text-white">Add Transition</span>}
      </div>
      <div className="flex items-center space-x-2 mt-2">
        <LinkIcon
          className="h-8 w-8 text-white cursor-pointer hover:text-pink-400"
          title="Add Connection"
        />
        {isExpanded && <span className="text-white">Add Connection</span>}
      </div>
    </div>
  );
};

export default PlaygroundToolbox;