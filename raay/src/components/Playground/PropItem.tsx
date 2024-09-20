// src/components/Playground/PropItem.tsx

import React, { useRef, useEffect } from 'react';
import { useDrag } from 'react-dnd';
import { Card } from '../Common/Card';

interface PropItemProps {
  prop: {
    id: string;
    name: string;
    description: string;
  };
}

interface DragItem {
  id: string;
  type: string;
}

const PropItem: React.FC<PropItemProps> = ({ prop }) => {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag<DragItem, void, { isDragging: boolean }>(() => ({
    type: 'PROP',
    item: { id: prop.id, type: 'PROP' },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  useEffect(() => {
    if (ref.current) {
      drag(ref.current);
    }
  }, [drag]);

  return (
    <div
      ref={ref}
      className={`bg-green-100 p-2 rounded-md mb-2 cursor-pointer ${
        isDragging ? 'opacity-50' : 'opacity-100'
      }`}
    >
      <h5 className="text-sm font-medium">{prop.name}</h5>
    </div>
  );
};

export default PropItem;
