// src/components/Playground/SceneBox.tsx

"use client"

import React, { useState } from 'react'
import { Handle, Position } from 'reactflow'
import { useDispatch, useSelector } from 'react-redux'
import { updateScene } from '../../store/scenesSlice'
import { RootState } from '../../store'
import CharacterCard from './CharacterCard'
import PropItem from './PropItem'
import Modal from '../UI/Modal'
import { Button } from '../Common/Button'
import dynamic from 'next/dynamic'

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
      props: string[]
      color: string
    }
  }
}

const SceneBox: React.FC<SceneBoxProps> = ({ data }) => {
  const dispatch = useDispatch()
  const { scene } = data
  const characters = useSelector((state: RootState) =>
    state.characters.characters.filter(char => scene.characters.includes(char.id))
  )
  const props = useSelector((state: RootState) =>
    state.props.props.filter(prop => scene.props.includes(prop.id))
  )

  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(scene.title)
  const [scriptContent, setScriptContent] = useState(scene.scriptContent)

  const handleSave = () => {
    dispatch(updateScene({ id: scene.id, title, scriptContent }))
    setIsEditing(false)
  }

  return (
    <div
      className={`${scene.color} p-2 rounded-md shadow-md border border-gray-300`}
      style={{ width: scene.size.width, height: scene.size.height }}
    >
      {/* Connection Handles */}
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />

      {/* Scene Content */}
      <div className="flex flex-col h-full">
        <div className="flex justify-between items-center">
          <h3 className="text-md font-semibold">{scene.title}</h3>
          {/* Removed 'size' prop */}
          <Button onClick={() => setIsEditing(true)} variant="secondary">
            Edit
          </Button>
        </div>
        <div className="mt-2 flex-1 overflow-auto">
          {scene.scriptContent ? (
            <div
              className="text-sm text-gray-700"
              dangerouslySetInnerHTML={{ __html: scene.scriptContent }}
            />
          ) : (
            <p className="text-sm text-gray-700">No content yet...</p>
          )}
        </div>
        <div className="mt-2">
          <h4 className="font-medium text-sm">Characters:</h4>
          <div className="flex flex-wrap gap-1">
            {characters.map(char => (
              <CharacterCard key={char.id} character={char} />
            ))}
          </div>
        </div>
        <div className="mt-2">
          <h4 className="font-medium text-sm">Props:</h4>
          <div className="flex flex-wrap gap-1">
            {props.map(prop => (
              <PropItem key={prop.id} prop={prop} />
            ))}
          </div>
        </div>
      </div>

      {/* Edit Scene Modal */}
      <Modal isOpen={isEditing} onClose={() => setIsEditing(false)} title="Edit Scene">
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
