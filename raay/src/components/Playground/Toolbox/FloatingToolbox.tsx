// src/components/Playground/Toolbox/FloatingToolbox.tsx

"use client";

import React, { useState } from 'react';
import {
  PencilIcon,
  TrashIcon,
  LinkIcon,
  UserPlusIcon,
  DocumentDuplicateIcon,
  EyeIcon,
  ChatBubbleBottomCenterIcon,
} from '@heroicons/react/24/outline';
import { Tooltip } from '../../Common/Tooltip';
import { cn } from '../../../lib/utils';
import ConnectionTypeToolbox from '../ConnectionTypeToolbox';

interface FloatingToolboxProps {
  onEdit: () => void;
  onDelete: () => void;
  onConnect: () => void;
  onAddCharacter: () => void;
  onDuplicate: () => void;
  onViewDetails: () => void;
  onAddComment: () => void;
  sceneId: string;
}

const FloatingToolbox: React.FC<FloatingToolboxProps> = ({
  onEdit,
  onDelete,
  onConnect,
  onAddCharacter,
  onDuplicate,
  onViewDetails,
  onAddComment,
  sceneId,
}) => {
  const [isConnectionToolboxVisible, setIsConnectionToolboxVisible] = useState(false);

  const handleConnectHover = () => {
    setIsConnectionToolboxVisible(true);
  };

  const handleConnectLeave = () => {
    setIsConnectionToolboxVisible(false);
  };

  return (
    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full mb-2 flex space-x-2 bg-gray-800 bg-opacity-90 rounded-md shadow-lg p-1 group">
      <Tooltip content="Edit Scene">
        <button onClick={onEdit} className="p-1 hover:bg-gray-700 rounded-md transition-colors duration-200">
          <PencilIcon className="h-5 w-5 text-white" />
        </button>
      </Tooltip>
      <Tooltip content="Delete Scene">
        <button onClick={onDelete} className="p-1 hover:bg-gray-700 rounded-md transition-colors duration-200">
          <TrashIcon className="h-5 w-5 text-white" />
        </button>
      </Tooltip>
      <Tooltip content="Connect Scenes">
        <div
          onMouseEnter={handleConnectHover}
          onMouseLeave={handleConnectLeave}
          className="relative"
        >
          <button className="p-1 hover:bg-gray-700 rounded-md transition-colors duration-200">
            <LinkIcon className="h-5 w-5 text-white" />
          </button>
          {isConnectionToolboxVisible && (
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2">
              <ConnectionTypeToolbox onSelect={onConnect} />
            </div>
          )}
        </div>
      </Tooltip>
      <Tooltip content="Add Character">
        <button onClick={onAddCharacter} className="p-1 hover:bg-gray-700 rounded-md transition-colors duration-200">
          <UserPlusIcon className="h-5 w-5 text-white" />
        </button>
      </Tooltip>
      <Tooltip content="Duplicate Scene">
        <button onClick={onDuplicate} className="p-1 hover:bg-gray-700 rounded-md transition-colors duration-200">
          <DocumentDuplicateIcon className="h-5 w-5 text-white" />
        </button>
      </Tooltip>
      <Tooltip content="View Details">
        <button onClick={onViewDetails} className="p-1 hover:bg-gray-700 rounded-md transition-colors duration-200">
          <EyeIcon className="h-5 w-5 text-white" />
        </button>
      </Tooltip>
      <Tooltip content="Add Comment">
        <button onClick={onAddComment} className="p-1 hover:bg-gray-700 rounded-md transition-colors duration-200">
          <ChatBubbleBottomCenterIcon className="h-5 w-5 text-white" />
        </button>
      </Tooltip>
    </div>
  );
};

export default FloatingToolbox;
