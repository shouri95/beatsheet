// src/components/Playground/Toolbar.tsx

"use client"

import React from 'react'
import { Button } from '../Common/Button'
import { useDispatch, useSelector } from 'react-redux'
import { addScene } from '../../store/scenesSlice'
import { addCharacter } from '../../store/charactersSlice'
import { addProp } from '../../store/propsSlice'
import { v4 as uuidv4 } from 'uuid'
import { UserCircleIcon, PlusCircleIcon } from '@heroicons/react/24/outline'
import { Menu, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { RootState } from '@/store'

const Toolbar: React.FC = () => {
  const dispatch = useDispatch()
  const scenes = useSelector((state: RootState) => state.scenes.scenes)

  const handleAddScene = () => {
    const newSceneNumber = scenes.length + 1
    const newScene = {
      id: uuidv4(),
      title: `Scene ${newSceneNumber}`,
      scriptContent: '',
      position: getNextScenePosition(scenes),
      size: { width: 200, height: 150 },
      characters: [],
      props: [],
      color: getRandomColor(),
    }
    dispatch(addScene(newScene))
  }

  const getNextScenePosition = (existingScenes: any[]): { x: number; y: number } => {
    // Simple logic to position new scenes incrementally
    if (existingScenes.length === 0) {
      return { x: 100, y: 100 }
    }
    const lastScene = existingScenes[existingScenes.length - 1]
    return { x: lastScene.position.x + 50, y: lastScene.position.y + 50 }
  }

  const getRandomColor = (): string => {
    const colors = ['bg-blue-100', 'bg-green-100', 'bg-yellow-100', 'bg-red-100', 'bg-purple-100']
    return colors[Math.floor(Math.random() * colors.length)]
  }

  const handleAddCharacter = () => {
    const newCharacter = {
      id: uuidv4(),
      name: `Character ${uuidv4().slice(0, 4)}`,
      description: '',
    }
    dispatch(addCharacter(newCharacter))
  }

  const handleAddProp = () => {
    const newProp = {
      id: uuidv4(),
      name: `Prop ${uuidv4().slice(0, 4)}`,
      description: '',
    }
    dispatch(addProp(newProp))
  }

  return (
    <div className="fixed top-0 left-0 w-full bg-white shadow-md z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left side - Toolbar Buttons */}
          <div className="flex items-center space-x-4">
            <Button onClick={handleAddScene} variant="primary">
              <PlusCircleIcon className="h-5 w-5 mr-2" />
              Add Scene
            </Button>
            <Button onClick={handleAddCharacter} variant="secondary">
              <PlusCircleIcon className="h-5 w-5 mr-2" />
              Add Character
            </Button>
            <Button onClick={handleAddProp} variant="secondary">
              <PlusCircleIcon className="h-5 w-5 mr-2" />
              Add Prop
            </Button>
          </div>

          {/* Right side - Account Dropdown */}
          <div className="flex items-center">
            <Menu as="div" className="relative">
              <Menu.Button className="flex items-center text-gray-700 focus:outline-none">
                <UserCircleIcon className="h-6 w-6" />
                <span className="ml-2">Account</span>
              </Menu.Button>
              <Transition
                as={Fragment}
                enter="transition ease-out duration-200"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-150"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg py-1 z-30">
                  <Menu.Item>
                    {({ active }) => (
                      <a
                        href="#"
                        className={`block px-4 py-2 text-sm text-gray-700 ${
                          active ? 'bg-gray-100' : ''
                        }`}
                      >
                        Profile
                      </a>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }) => (
                      <a
                        href="#"
                        className={`block px-4 py-2 text-sm text-gray-700 ${
                          active ? 'bg-gray-100' : ''
                        }`}
                      >
                        Settings
                      </a>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={() => { /* Implement logout logic */ }}
                        className={`block w-full text-left px-4 py-2 text-sm text-gray-700 ${
                          active ? 'bg-gray-100' : ''
                        }`}
                      >
                        Logout
                      </button>
                    )}
                  </Menu.Item>
                </Menu.Items>
              </Transition>
            </Menu>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Toolbar
