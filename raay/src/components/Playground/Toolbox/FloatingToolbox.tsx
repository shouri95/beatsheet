import React, { useState, useRef, useEffect } from 'react';
import { PencilIcon, TrashIcon, LinkIcon, UserPlusIcon, DocumentDuplicateIcon, EyeIcon, ChatBubbleBottomCenterIcon } from '@heroicons/react/24/outline';
import { Tooltip } from '../../Common/Tooltip';
import ConnectionTypeToolbox from './ConnectionTypeToolbox';

interface FloatingToolboxProps {
  onEdit: () => void;
  onDelete: () => void;
  onAddCharacter: () => void;
  onDuplicate: () => void;
  onViewDetails: () => void;
  onAddComment: () => void;
  sceneId: string;
}

const FloatingToolbox: React.FC<FloatingToolboxProps> = ({
  onEdit,
  onDelete,
  onAddCharacter,
  onDuplicate,
  onViewDetails,
  onAddComment,
  sceneId,
}) => {
  const [isConnectionTypeToolboxVisible, setIsConnectionTypeToolboxVisible] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const toolboxRef = useRef<HTMLDivElement>(null);
  const connectionToolboxRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const toggleConnectionTypeToolbox = () => {
    setIsConnectionTypeToolboxVisible(!isConnectionTypeToolboxVisible);
    setActiveTooltip(null);
  };

  const handleButtonClick = (action: () => void) => {
    action();
    setActiveTooltip(null);
  };

  const handleMouseEnter = (tooltipContent: string) => {
    setActiveTooltip(tooltipContent);
  };

  const handleMouseLeave = () => {
    setActiveTooltip(null);
  };

  const handleToolboxMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsConnectionTypeToolboxVisible(false);
      setActiveTooltip(null);
    }, 300);
  };

  const handleToolboxMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        toolboxRef.current &&
        !toolboxRef.current.contains(event.target as Node) &&
        connectionToolboxRef.current &&
        !connectionToolboxRef.current.contains(event.target as Node)
      ) {
        setIsConnectionTypeToolboxVisible(false);
        setActiveTooltip(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div 
      ref={toolboxRef}
      className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full mb-2 flex space-x-2 bg-gray-800 bg-opacity-90 rounded-md shadow-lg p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
      onMouseLeave={handleToolboxMouseLeave}
      onMouseEnter={handleToolboxMouseEnter}
    >
      <Tooltip content="Edit Scene" visible={activeTooltip === "Edit Scene"}>
        <button 
          onClick={() => handleButtonClick(onEdit)} 
          onMouseEnter={() => handleMouseEnter("Edit Scene")}
          onMouseLeave={handleMouseLeave}
          className="p-1 hover:bg-gray-700 rounded-md transition-colors duration-200"
        >
          <PencilIcon className="h-5 w-5 text-white" />
        </button>
      </Tooltip>
      <Tooltip content="Delete Scene" visible={activeTooltip === "Delete Scene"}>
        <button 
          onClick={() => handleButtonClick(onDelete)}
          onMouseEnter={() => handleMouseEnter("Delete Scene")}
          onMouseLeave={handleMouseLeave}
          className="p-1 hover:bg-gray-700 rounded-md transition-colors duration-200"
        >
          <TrashIcon className="h-5 w-5 text-white" />
        </button>
      </Tooltip>
      <Tooltip content="Connect Scenes" visible={activeTooltip === "Connect Scenes"}>
        <div className="relative">
          <button
            onClick={toggleConnectionTypeToolbox}
            onMouseEnter={() => handleMouseEnter("Connect Scenes")}
            onMouseLeave={handleMouseLeave}
            className="p-1 hover:bg-gray-700 rounded-md transition-colors duration-200"
          >
            <LinkIcon className="h-5 w-5 text-white" />
          </button>
          <div
            ref={connectionToolboxRef}
            onMouseEnter={handleToolboxMouseEnter}
            onMouseLeave={handleToolboxMouseLeave}
          >
            <ConnectionTypeToolbox
              isVisible={isConnectionTypeToolboxVisible}
              onClose={() => setIsConnectionTypeToolboxVisible(false)}
            />
          </div>
        </div>
      </Tooltip>
      <Tooltip content="Add Character" visible={activeTooltip === "Add Character"}>
        <button 
          onClick={() => handleButtonClick(onAddCharacter)}
          onMouseEnter={() => handleMouseEnter("Add Character")}
          onMouseLeave={handleMouseLeave}
          className="p-1 hover:bg-gray-700 rounded-md transition-colors duration-200"
        >
          <UserPlusIcon className="h-5 w-5 text-white" />
        </button>
      </Tooltip>
      <Tooltip content="Duplicate Scene" visible={activeTooltip === "Duplicate Scene"}>
        <button 
          onClick={() => handleButtonClick(onDuplicate)}
          onMouseEnter={() => handleMouseEnter("Duplicate Scene")}
          onMouseLeave={handleMouseLeave}
          className="p-1 hover:bg-gray-700 rounded-md transition-colors duration-200"
        >
          <DocumentDuplicateIcon className="h-5 w-5 text-white" />
        </button>
      </Tooltip>
      <Tooltip content="View Details" visible={activeTooltip === "View Details"}>
        <button 
          onClick={() => handleButtonClick(onViewDetails)}
          onMouseEnter={() => handleMouseEnter("View Details")}
          onMouseLeave={handleMouseLeave}
          className="p-1 hover:bg-gray-700 rounded-md transition-colors duration-200"
        >
          <EyeIcon className="h-5 w-5 text-white" />
        </button>
      </Tooltip>
      <Tooltip content="Add Comment" visible={activeTooltip === "Add Comment"}>
        <button 
          onClick={() => handleButtonClick(onAddComment)}
          onMouseEnter={() => handleMouseEnter("Add Comment")}
          onMouseLeave={handleMouseLeave}
          className="p-1 hover:bg-gray-700 rounded-md transition-colors duration-200"
        >
          <ChatBubbleBottomCenterIcon className="h-5 w-5 text-white" />
        </button>
      </Tooltip>
    </div>
  );
};

export default FloatingToolbox;