import React, { useState } from 'react'
import { Button } from '../../../../Common/Button'

interface SceneEditorProps {
  scene: {
    id: string
    title: string
    scriptContent: string
  }
  onSave: (updatedScene: { title: string; scriptContent: string }) => void
  onClose: () => void
}

const SceneEditor: React.FC<SceneEditorProps> = ({ scene, onSave, onClose }) => {
  const [title, setTitle] = useState(scene.title)
  const [scriptContent, setScriptContent] = useState(scene.scriptContent)

  const handleSave = () => {
    onSave({ title, scriptContent })
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="mb-4">
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
          Scene Title
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
        />
      </div>
      <div className="mb-4">
        <label htmlFor="scriptContent" className="block text-sm font-medium text-gray-700">
          Script Content
        </label>
        <textarea
          id="scriptContent"
          value={scriptContent}
          onChange={(e) => setScriptContent(e.target.value)}
          rows={15}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 font-mono"
          style={{ whiteSpace: 'pre-wrap' }}
        />
      </div>
      <div className="flex justify-end space-x-2">
        <Button onClick={onClose} variant="secondary">
          Cancel
        </Button>
        <Button onClick={handleSave} variant="primary">
          Save Changes
        </Button>
      </div>
    </div>
  )
}

export default SceneEditor