// src/components/Playground/ConnectionTypeToolbox.tsx

"use client";

import React from 'react';
import {
  PencilIcon,
  LinkIcon,
  UserPlusIcon,
  FireIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  ChatBubbleBottomCenterIcon,
} from '@heroicons/react/24/outline';
import { Tooltip } from '../Common/Tooltip';
import { cn } from '../../lib/utils';

interface ConnectionTypeToolboxProps {
  onSelect: (type: string) => void;
}

const connectionTypes = [
  { type: 'sequential', icon: LinkIcon, color: '#4f46e5', label: 'Sequential' },
  { type: 'nonLinear', icon: PencilIcon, color: '#f97316', label: 'Non-Linear' },
  { type: 'reference', icon: UserPlusIcon, color: '#10b981', label: 'Reference' },
  { type: 'arc', icon: FireIcon, color: '#a855f7', label: 'Story Arc' },
  { type: 'parallel', icon: DocumentDuplicateIcon, color: '#ef4444', label: 'Parallel Storyline' },
  { type: 'thematic', icon: TrashIcon, color: '#6b7280', label: 'Thematic' },
  { type: 'dialogue', icon: ChatBubbleBottomCenterIcon, color: '#ec4899', label: 'Dialogue' },
];

const ConnectionTypeToolbox: React.FC<ConnectionTypeToolboxProps> = ({ onSelect }) => {
  return (
    <div className="flex space-x-2 bg-gray-800 bg-opacity-90 p-2 rounded-lg shadow-lg">
      {connectionTypes.map((ct) => (
        <Tooltip key={ct.type} content={ct.label}>
          <button
            onClick={() => onSelect(ct.type)}
            className={cn(
              "p-2 rounded-md",
              "flex items-center justify-center",
              "transition-transform transform hover:scale-110"
            )}
            style={{ backgroundColor: ct.color }}
            aria-label={ct.label}
          >
            <ct.icon className="h-5 w-5 text-white" />
          </button>
        </Tooltip>
      ))}
    </div>
  );
};

export default ConnectionTypeToolbox;
