"use client"

import React from 'react'

const BeatSheet: React.FC = () => {
  return (
    <div className="fixed right-0 top-0 w-1/4 h-full bg-white p-4 overflow-auto">
      <h2 className="text-xl font-bold mb-4">Beat Sheet</h2>
      {/* Render beat sheet items here */}
      <ul className="list-disc list-inside">
        <li>Opening Scene</li>
        <li>Inciting Incident</li>
        <li>Midpoint</li>
        <li>Climax</li>
        <li>Resolution</li>
      </ul>
    </div>
  )
}

export default BeatSheet
