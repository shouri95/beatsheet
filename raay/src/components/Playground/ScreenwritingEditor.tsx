// src/components/Playground/ScreenwritingEditor.tsx

"use client"

import React, { useState, useEffect, useRef } from 'react'
import { XMarkIcon, CheckIcon, Bars3Icon } from '@heroicons/react/24/outline'
import Portal from '../UI/Portal' // Import the Portal component

interface ScreenwritingEditorProps {
  scene: {
    id: string
    title: string
    scriptContent: string
  }
  onSave: (updatedScene: { title: string; scriptContent: string }) => void
  onClose: () => void
}

const ScreenwritingEditor: React.FC<ScreenwritingEditorProps> = ({ scene, onSave, onClose }) => {
  const [title, setTitle] = useState(scene.title)
  const [scriptContent, setScriptContent] = useState(scene.scriptContent)
  const editorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (editorRef.current && !editorRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onClose])

  const handleSave = () => {
    onSave({ title, scriptContent })
  }

  return (
    <Portal>
      <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
        <div 
          ref={editorRef}
          className="bg-gray-100 w-full max-w-4xl h-3/4 rounded-lg shadow-lg flex flex-col"
          style={{
            backgroundImage: 'radial-gradient(circle, #d7d7d7 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}
        >
          <div className="flex items-center justify-between p-4 border-b border-gray-300">
            <button className="text-gray-600 hover:text-gray-800">
              <Bars3Icon className="h-6 w-6" />
            </button>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-xl font-bold text-center bg-transparent border-none focus:outline-none focus:ring-0"
              placeholder="Scene Title"
            />
            <div className="flex space-x-4">
              <button
                onClick={handleSave}
                className="text-green-500 hover:text-green-700"
              >
                <CheckIcon className="h-6 w-6" />
              </button>
              <button
                onClick={onClose}
                className="text-red-500 hover:text-red-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>
          <div className="flex-grow p-4 overflow-auto">
            <textarea
              value={scriptContent}
              onChange={(e) => setScriptContent(e.target.value)}
              className="w-full h-full p-4 bg-white rounded-md border border-gray-300 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder={`EXT. LOCATION - DAY

Character Name
    (parenthetical)
    Dialogue goes here...`}
              style={{
                fontFamily: 'Courier, monospace',
                fontSize: '14px',
                lineHeight: '1.5',
              }}
            />
          </div>
        </div>
      </div>
    </Portal>
  )
}

export default ScreenwritingEditor
