// src/app/page.tsx

"use client"

import React from 'react'
import PlaygroundCanvas from '../components/Playground/PlaygroundCanvas'
import Toolbar from '../components/Playground/Toolbar/Toolbar'
import SceneConnector from '../components/Playground/SceneLinking/SceneConnections/SceneConnector';

const Playground: React.FC = () => {
  return (
    <div className="relative w-full h-screen">
      {/* Toolbar */}
      <Toolbar />

      {/* Playground Canvas */}
      <PlaygroundCanvas />
    </div>
  )
}

export default Playground