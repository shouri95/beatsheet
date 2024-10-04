// src/components/Playground/Toolbox/ConnectionTypeToolbox.tsx

import React, { useReducer, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../store';
import { setActiveConnectionType } from '../../../store/uiSlice';
import { ConnectionType } from '../../../store/connectionsSlice';
import { PencilIcon, TrashIcon, LinkIcon, UserPlusIcon, FireIcon, DocumentDuplicateIcon, ChatBubbleBottomCenterIcon } from '@heroicons/react/24/outline';
import { Tooltip } from '../../Common/Tooltip';
import { connectionTypes } from '../../../types/connectionTypes';
import styles from './ConnectionTypeToolbox.module.css';

interface ConnectionTypeToolboxProps {
  isVisible: boolean;
  onClose: () => void;
}

interface TooltipState {
  activeTooltip: string | null;
}

const initialState: TooltipState = {
  activeTooltip: null,
};

const tooltipReducer = (state: TooltipState, action: { type: string; payload?: string | null }): TooltipState => {
  if (action.payload === undefined) {
    return { ...state, activeTooltip: null };
  }
  switch (action.type) {
    case 'SET_TOOLTIP':
      return { ...state, activeTooltip: action.payload ?? null };
    case 'CLEAR_TOOLTIP':
      return { ...state, activeTooltip: null };
    default:
      return state;
  }
};

const ConnectionTypeToolbox: React.FC<ConnectionTypeToolboxProps> = ({ isVisible, onClose }) => {
  const dispatch = useDispatch();
  const [state, tooltipDispatch] = useReducer(tooltipReducer, initialState);

  useEffect(() => {
    if (!isVisible) {
      tooltipDispatch({ type: 'CLEAR_TOOLTIP' });
    }
  }, [isVisible]);

  if (!isVisible) return null;

  const handleConnectionTypeClick = (type: ConnectionType) => {
    dispatch(setActiveConnectionType(type));
    onClose();
  };

  const handleMouseEnter = (tooltipContent: string) => {
    tooltipDispatch({ type: 'SET_TOOLTIP', payload: tooltipContent });
  };

  const handleMouseLeave = () => {
    tooltipDispatch({ type: 'CLEAR_TOOLTIP' });
  };

  return (
    <div className={styles.toolboxContainer}>
      {connectionTypes.map((ct) => (
        <Tooltip key={ct.type} content={ct.label} visible={state.activeTooltip === ct.label}>
          <button
            onClick={() => handleConnectionTypeClick(ct.type)}
            onMouseEnter={() => handleMouseEnter(ct.label)}
            onMouseLeave={handleMouseLeave}
            className={styles.button}
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