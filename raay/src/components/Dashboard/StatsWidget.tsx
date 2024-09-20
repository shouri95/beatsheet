"use client"

import React from 'react'
import { Card } from '../Common/Card'

const StatsWidget: React.FC = () => {
  return (
    <Card>
      <h3 className="text-lg font-semibold">Project Statistics</h3>
      <ul className="list-disc list-inside mt-2">
        <li>Scenes: 10</li>
        <li>Characters: 5</li>
        <li>Props: 8</li>
        <li>Tone Consistency: 80%</li>
        <!-- Add more stats as needed -->
      </ul>
    </Card>
  )
}

export default StatsWidget
