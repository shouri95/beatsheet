import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../../../store';
import { setActiveConnectionType } from '../../../../../store/uiSlice';
import { ConnectionType } from '../../../../../store/connectionsSlice';
import { PencilIcon, TrashIcon, LinkIcon, UserPlusIcon, FireIcon, DocumentDuplicateIcon, ChatBubbleBottomCenterIcon } from '@heroicons/react/24/outline';
import { Tooltip } from '../../../../Common/Tooltip';

interface ConnectionTypeToolboxProps {
  isVisible: boolean;
  onClose: () => void;
}

const connectionTypes: { type: ConnectionType; icon: React.ElementType; label: string }[] = [
  { type: 'sequential', icon: LinkIcon, label: 'Sequential' },
  { type: 'nonLinear', icon: PencilIcon, label: 'Non-Linear' },
  { type: 'reference', icon: UserPlusIcon, label: 'Reference' },
  { type: 'arc', icon: FireIcon, label: 'Story Arc' },
  { type: 'parallel', icon: DocumentDuplicateIcon, label: 'Parallel' },
  { type: 'thematic', icon: TrashIcon, label: 'Thematic' },
  { type: 'dialogue', icon: ChatBubbleBottomCenterIcon, label: 'Dialogue' },
];

const ConnectionTypeToolbox: React.FC<ConnectionTypeToolboxProps> = ({ isVisible, onClose }) => {
  const dispatch = useDispatch();
  const activeConnectionType = useSelector((state: RootState) => state.ui.activeConnectionType);

  const handleConnectionTypeClick = (type: ConnectionType) => {
    dispatch(setActiveConnectionType(type));
    onClose();
  };

  if (!isVisible) return null;

  return (
    <div className="absolute bottom-full left-0 mb-2 bg-gray-800 rounded-md shadow-lg p-1 flex">
      {connectionTypes.map((ct) => (
        <Tooltip key={ct.type} content={ct.label}>
          <button
            onClick={() => handleConnectionTypeClick(ct.type)}
            className="p-2 hover:bg-gray-700 rounded-md transition-colors duration-200"
            aria-label={ct.label}
          >
            <ct.icon 
              className={`h-5 w-5 ${activeConnectionType === ct.type ? 'text-blue-500' : 'text-white'}`} 
            />
          </button>
        </Tooltip>
      ))}
    </div>
  );
};

export default ConnectionTypeToolbox;