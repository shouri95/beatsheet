// src/components/Playground/Toolbar.tsx
"use client"

import React from 'react'
import { useDispatch } from 'react-redux'
import { addScene } from '../../../store/scenesSlice'
import { addCharacter } from '../../../store/charactersSlice'
import { v4 as uuidv4 } from 'uuid'
import { useRouter } from 'next/navigation'

const Toolbar: React.FC = () => {
  const dispatch = useDispatch()
  const router = useRouter()

  const handleAddScene = () => {
    const newScene = {
      id: uuidv4(),
      title: `Scene ${uuidv4().slice(0, 4)}`,
      scriptContent: '',
      position: { x: Math.random() * 500, y: Math.random() * 500 },
      size: { width: 250, height: 150 },
      characters: [],
      props: [],
      color: 'bg-white',
    }
    dispatch(addScene(newScene))
  }

  const handleAddCharacter = () => {
    const newCharacter = {
      id: uuidv4(),
      name: `Character ${uuidv4().slice(0, 4)}`,
      description: '',
    }
    dispatch(addCharacter(newCharacter))
  }

  const navigateToScreenplay = () => {
    router.push('/screenplay')
  }

  return (
    <div className="fixed top-0 left-0 w-full z-20 p-4">
      <div className="flex justify-between items-center font-sans text-black text-sm">
        <div className="flex space-x-4">
          <button onClick={handleAddScene} className="hover:text-gray-600 transition-colors duration-300 font-bold">
            [ADD SCENE]
          </button>
          <button onClick={handleAddCharacter} className="hover:text-gray-600 transition-colors duration-300 font-bold">
            [ADD CHARACTER]
          </button>
          <button onClick={handleAddCharacter} className="hover:text-gray-600 transition-colors duration-300 font-bold">
            [STORYBOARD]
          </button>          
        </div>
        <div className="flex space-x-6">
          <button onClick={navigateToScreenplay} className="hover:text-gray-600 transition-colors duration-300 font-bold">
            [VIEW SCREENPLAY]
          </button>
          <button className="hover:text-gray-600 transition-colors duration-300 font-bold">
            [ACCOUNT]
          </button>
        </div>
      </div>
    </div>
  )
}

export default Toolbar