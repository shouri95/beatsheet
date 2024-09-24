// src/components/Playground/SceneBox.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { updateScene } from '../../store/scenesSlice'
import { RootState } from '../../store'
import CharacterCard from './CharacterCard'
// Removed PropItem import as props are no longer used
// import PropItem from './PropItem'
import Modal from '../UI/Modal'
import { Button } from '../Common/Button'
import dynamic from 'next/dynamic'
import { Tooltip } from '../Common/Tooltip'
import { PencilIcon } from '@heroicons/react/24/outline'

// Dynamically import ReactQuill to prevent SSR issues
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false })
import 'react-quill/dist/quill.snow.css'

interface SceneBoxProps {
  data: {
    scene: {
      id: string
      title: string
      scriptContent: string
      position: { x: number; y: number }
      size: { width: number; height: number }
      characters: string[]
      // props: string[] // Removed props
      color: string
    }
    index: number // Added index for numbering
  }
}

const SceneBox: React.FC<SceneBoxProps> = ({ data }) => {
  const dispatch = useDispatch()
  const { scene, index } = data
  const characters = useSelector((state: RootState) =>
    state.characters.characters.filter(char => scene.characters.includes(char.id))
  )

  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(scene.title)
  const [scriptContent, setScriptContent] = useState(scene.scriptContent)
  const [isTitleEditing, setIsTitleEditing] = useState(false)
  const [isContentEditing, setIsContentEditing] = useState(false)

  useEffect(() => {
    setTitle(scene.title)
  }, [scene.title])

  useEffect(() => {
    setScriptContent(scene.scriptContent)
  }, [scene.scriptContent])

  const handleSave = () => {
    dispatch(updateScene({ id: scene.id, title, scriptContent }))
    setIsEditing(false)
  }

  const handleTitleBlur = () => {
    setIsTitleEditing(false)
    dispatch(updateScene({ id: scene.id, title, scriptContent }))
  }

  const handleContentBlur = () => {
    setIsContentEditing(false)
    dispatch(updateScene({ id: scene.id, title, scriptContent }))
  }

  return (
    <div
      className={`relative p-2 rounded-lg shadow-md border border-gray-300 transition-transform duration-300 ease-in-out hover:shadow-lg hover:transform scale-105`}
      style={{ width: scene.size.width, height: scene.size.height }}
      onMouseEnter={() => {}}
      onMouseLeave={() => {}}
    >
      {/* Scene Number and Title */}
      <div className="flex items-center justify-between">
        {isTitleEditing ? (
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            autoFocus
            className="text-lg font-semibold border-b border-gray-400 focus:outline-none focus:border-blue-500"
          />
        ) : (
          <h3
            className="text-lg font-semibold cursor-pointer"
            onDoubleClick={() => setIsTitleEditing(true)}
          >
            {index}. {title}
          </h3>
        )}
        <Tooltip content="Edit Scene">
          <button
            onClick={() => setIsEditing(true)}
            className="text-gray-500 hover:text-gray-700 transition-colors duration-300"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
        </Tooltip>
      </div>

      {/* Script Content */}
      <div className="mt-2 flex-1 overflow-auto">
        {isContentEditing ? (
          <ReactQuill
            theme="snow"
            value={scriptContent}
            onChange={setScriptContent}
            onBlur={handleContentBlur}
            className="h-24"
          />
        ) : (
          <div
            className="text-sm text-black cursor-pointer"
            onDoubleClick={() => setIsContentEditing(true)}
            dangerouslySetInnerHTML={{ __html: scriptContent || '<p>No content yet...</p>' }}
          />
        )}
      </div>

      {/* Characters */}
      <div className="mt-2">
        <h4 className="font-medium text-sm">Characters:</h4>
        <div className="flex flex-wrap gap-1">
          {characters.map(char => (
            // Placeholder icons for male and female characters
            <Tooltip key={char.id} content={char.name}>
              <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center">
                {/* Placeholder for future male/female icons */}
                {/* You can replace this with actual icons when implemented */}
                {char.name.charAt(0).toUpperCase()}
              </div>
            </Tooltip>
          ))}
        </div>
      </div>

      {/* Edit Scene Modal */}
      <Modal isOpen={isEditing} onClose={() => setIsEditing(false)} title={`Edit Scene ${index}`}>
        <div className="mt-4">
          <label htmlFor="scene-title" className="block text-sm font-medium text-gray-700">
            Scene Title
          </label>
          <input
            type="text"
            id="scene-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter scene title"
          />
        </div>
        <div className="mt-4">
          <label htmlFor="script-content" className="block text-sm font-medium text-gray-700">
            Script Content
          </label>
          <ReactQuill
            theme="snow"
            value={scriptContent}
            onChange={setScriptContent}
            className="mt-1"
            placeholder="Write your screenplay here..."
          />
        </div>
        <div className="mt-6 flex justify-end space-x-2">
          <Button onClick={() => setIsEditing(false)} variant="secondary">
            Cancel
          </Button>
          <Button onClick={handleSave} variant="primary">
            Save
          </Button>
        </div>
      </Modal>
    </div>
  )
}

export default SceneBox
