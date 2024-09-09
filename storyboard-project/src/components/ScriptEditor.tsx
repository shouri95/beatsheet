import React, { useState } from 'react';
import { Button } from "@/components/ui/button";

const ScriptEditor: React.FC = () => {
  const [content, setContent] = useState('');
  const [format, setFormat] = useState('Action');

  const applyFormatting = (formatType: string) => {
    setFormat(formatType);
    // Apply formatting logic to content based on the selected format type
  };

  return (
    <div className="script-editor">
      <div className="toolbar flex items-center space-x-2 mb-4">
        <Button onClick={() => applyFormatting('Scene Heading')} size="sm">Scene Heading</Button>
        <Button onClick={() => applyFormatting('Action')} size="sm">Action</Button>
        <Button onClick={() => applyFormatting('Character')} size="sm">Character</Button>
        <Button onClick={() => applyFormatting('Dialogue')} size="sm">Dialogue</Button>
        <Button onClick={() => applyFormatting('Parenthetical')} size="sm">Parenthetical</Button>
      </div>
      <textarea
        className={`w-full p-2 border border-gray-300 rounded ${format.toLowerCase().replace(' ', '-')}`}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write your screenplay here..."
      />
    </div>
  );
};

export default ScriptEditor;
