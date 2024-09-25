// src/components/Playground/ConnectionSummary.tsx

import React, { useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { toggleConnectionType } from '../../store/uiSlice';
import { deleteConnection } from '../../store/connectionsSlice';
import { Tooltip } from '../Common/Tooltip';
import { TrashIcon } from '@heroicons/react/24/outline';
import { cn } from '../../lib/utils';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';

interface ConnectionItemProps {
  connection: {
    from: string;
    to: string;
    type: string;
  };
}

const ConnectionItem: React.FC<ConnectionItemProps> = ({ connection }) => {
  const dispatch = useDispatch();
  const handleDelete = () => {
    dispatch(deleteConnection({ from: connection.from, to: connection.to }));
  };

  return (
    <div className="flex justify-between items-center p-2 hover:bg-gray-200 rounded-md">
      <div>
        <span className="font-semibold">{connection.type.toUpperCase()}</span>:
        <span className="ml-1">Scene {connection.from} → Scene {connection.to}</span>
      </div>
      <Tooltip content="Delete Connection">
        <button onClick={handleDelete} className="text-red-500 hover:text-red-700">
          <TrashIcon className="h-5 w-5" />
        </button>
      </Tooltip>
    </div>
  );
};

const ConnectionsSummary: React.FC = () => {
  const dispatch = useDispatch();
  const connections = useSelector((state: RootState) => state.connections.connections);
  const connectionFilters = useSelector((state: RootState) => state.ui.connectionFilters);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredConnections = useMemo(() => {
    return connections.filter(
      (conn) =>
        connectionFilters[conn.type as keyof typeof connectionFilters] &&
        (`Scene ${conn.from}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
          `Scene ${conn.to}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
          conn.type.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [connections, connectionFilters, searchTerm]);

  const handleToggleFilter = (type: string) => {
    dispatch(toggleConnectionType(type as keyof typeof connectionFilters));
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">All Connections</h2>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search connections..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="mb-4">
        <h3 className="font-semibold mb-2">Filter by Type</h3>
        <div className="flex flex-wrap gap-2">
          {Object.keys(connectionFilters).map((type) => (
            <label key={type} className="flex items-center space-x-1">
              <input
                type="checkbox"
                checked={connectionFilters[type as keyof typeof connectionFilters]}
                onChange={() => handleToggleFilter(type)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <span>{type.charAt(0).toUpperCase() + type.slice(1)}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="h-64">
        {filteredConnections.length > 0 ? (
          <List
            height={256}
            itemCount={filteredConnections.length}
            itemSize={50}
            width="100%"
            className="border border-gray-300 rounded-md"
          >
            {({ index, style }: ListChildComponentProps) => (
              <div style={style}>
                <ConnectionItem connection={filteredConnections[index]} />
              </div>
            )}
          </List>
        ) : (
          <p className="text-gray-500">No connections found.</p>
        )}
      </div>
    </div>
  );
};

export default ConnectionsSummary;