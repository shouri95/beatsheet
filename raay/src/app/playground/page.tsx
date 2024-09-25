// src/app/playground/page.tsx

"use client"

import React from 'react'
import PlaygroundCanvas from '../../components/Playground/PlaygroundCanvas'
import Toolbar from '../../components/Playground/Toolbar/Toolbar'
import ToneMeter from '../../components/Playground/ToneMeter'
import BeatSheet from '../../components/Playground/BeatSheet'

const Playground: React.FC = () => {
  return (
    <div className="relative w-full h-screen">
      {/* Toolbar */}
      <Toolbar />

      {/* Playground Canvas */}
      <PlaygroundCanvas />

      {/* Tone Meter */}
      <ToneMeter currentToneScore={80} desiredToneScore={100} />

      {/* Beat Sheet */}
      <BeatSheet />
    </div>
  )
}

export default Playground
