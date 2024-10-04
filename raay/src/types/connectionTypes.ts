// src/types/connectionTypes.ts

import { ConnectionType } from '../store/connectionsSlice';
import { PencilIcon, TrashIcon, LinkIcon, UserPlusIcon, FireIcon, DocumentDuplicateIcon, ChatBubbleBottomCenterIcon } from '@heroicons/react/24/outline';

export const connectionTypes: { type: ConnectionType; icon: React.ElementType; label: string }[] = [
  { type: 'sequential', icon: LinkIcon, label: 'Sequential' },
  { type: 'nonLinear', icon: PencilIcon, label: 'Non-Linear' },
  { type: 'reference', icon: UserPlusIcon, label: 'Reference' },
  { type: 'arc', icon: FireIcon, label: 'Story Arc' },
  { type: 'parallel', icon: DocumentDuplicateIcon, label: 'Parallel' },
  { type: 'thematic', icon: TrashIcon, label: 'Thematic' },
  { type: 'dialogue', icon: ChatBubbleBottomCenterIcon, label: 'Dialogue' },
];