import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

interface SceneNodeData {
  id: string;
  title: string;
}

const SceneNode: React.FC<NodeProps<SceneNodeData>> = ({ data }) => {
  return (
    <div className="p-2 bg-white rounded-md shadow-md">
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#555' }}
        isConnectable={true}
      />
      <div className="text-center font-semibold">{data.title}</div>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#555' }}
        isConnectable={true}
      />
    </div>
  );
};

export default SceneNode;