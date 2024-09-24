// src/app/screenplay/page.tsx

"use client"

import React from 'react'
import ScreenplayFormatter from '../../components/Screenplay/ScreenplayFormatter'

const ScreenplayPage: React.FC = () => {
  return (
    <div className="p-4">
      <ScreenplayFormatter />
    </div>
  )
}

export default ScreenplayPage
