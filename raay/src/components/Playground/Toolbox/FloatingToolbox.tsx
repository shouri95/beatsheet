// src/components/Playground/FloatingToolbox.tsx

"use client";

import React from 'react';
import {
  PencilIcon,
  TrashIcon,
  LinkIcon,
  UserPlusIcon,
  DocumentDuplicateIcon,
  EyeIcon,
  ChatBubbleBottomCenterIcon
} from '@heroicons/react/24/outline';
import { Tooltip } from '../../Common/Tooltip';
import { cn } from '../../../lib/utils';

interface FloatingToolboxProps {
  onEdit: () => void;
  onDelete: () => void;
  onConnect: () => void;
  onAddCharacter: () => void;
  onDuplicate: () => void;
  onViewDetails: () => void;
  onAddComment: () => void;
}

const FloatingToolbox: React.FC<FloatingToolboxProps> = ({
  onEdit,
  onDelete,
  onConnect,
  onAddCharacter,
  onDuplicate,
  onViewDetails,
  onAddComment,
}) => {
  const handleClick = (action: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    action();
  };

  return (
    <div className={cn(
      "absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full mb-2",
      "flex space-x-2 bg-gray-800 bg-opacity-90 rounded-md shadow-lg p-1",
      "transition-all duration-300 ease-in-out opacity-0 group-hover:opacity-100 group-hover:-translate-y-[calc(100%+0.5rem)]"
    )}>
      <Tooltip content="Edit Scene">
        <button onClick={handleClick(onEdit)} className="p-1 hover:bg-gray-700 rounded-md transition-colors duration-200">
          <PencilIcon className="h-5 w-5 text-white" />
        </button>
      </Tooltip>
      <Tooltip content="Delete Scene">
        <button onClick={handleClick(onDelete)} className="p-1 hover:bg-gray-700 rounded-md transition-colors duration-200">
          <TrashIcon className="h-5 w-5 text-white" />
        </button>
      </Tooltip>
      <Tooltip content="Connect Scenes">
        <button onClick={handleClick(onConnect)} className="p-1 hover:bg-gray-700 rounded-md transition-colors duration-200">
          <LinkIcon className="h-5 w-5 text-white" />
        </button>
      </Tooltip>
      <Tooltip content="Add Character">
        <button onClick={handleClick(onAddCharacter)} className="p-1 hover:bg-gray-700 rounded-md transition-colors duration-200">
          <UserPlusIcon className="h-5 w-5 text-white" />
        </button>
      </Tooltip>
      <Tooltip content="Duplicate Scene">
        <button onClick={handleClick(onDuplicate)} className="p-1 hover:bg-gray-700 rounded-md transition-colors duration-200">
          <DocumentDuplicateIcon className="h-5 w-5 text-white" />
        </button>
      </Tooltip>
      <Tooltip content="View Details">
        <button onClick={handleClick(onViewDetails)} className="p-1 hover:bg-gray-700 rounded-md transition-colors duration-200">
          <EyeIcon className="h-5 w-5 text-white" />
        </button>
      </Tooltip>
      <Tooltip content="Add Comment">
        <button onClick={handleClick(onAddComment)} className="p-1 hover:bg-gray-700 rounded-md transition-colors duration-200">
          <ChatBubbleBottomCenterIcon className="h-5 w-5 text-white" />
        </button>
      </Tooltip>
    </div>
  );
};

export default FloatingToolbox;