// src/components/Playground/ToneMeter.tsx
"use client"

import React from 'react'
import { Progress } from '../Common/Progress'
import { Tooltip } from '../Common/Tooltip'

interface ToneMeterProps {
  currentToneScore: number
  desiredToneScore: number
  toneBreakdown?: {
    category: string
    score: number
  }[]
}

const ToneMeter: React.FC<ToneMeterProps> = ({ currentToneScore, desiredToneScore, toneBreakdown = [] }) => {
  const overallConsistency = (currentToneScore / desiredToneScore) * 100

  return (
    <div className="fixed bottom-0 right-0 p-4 bg-white shadow-lg rounded-tl-lg">
      <h3 className="text-lg font-semibold mb-2">Tone Consistency</h3>
      <div className="mb-2">
        <Progress value={currentToneScore} max={desiredToneScore} />
        <span className="text-sm">{overallConsistency.toFixed(1)}% Consistent</span>
      </div>
      <div className="space-y-1">
        {toneBreakdown.map((item) => (
          <Tooltip key={item.category} content={`${item.category}: ${item.score}%`}>
            <div className="flex items-center">
              <span className="text-xs w-20 truncate">{item.category}</span>
              <Progress value={item.score} max={100} />
            </div>
          </Tooltip>
        ))}
      </div>
    </div>
  )
}

export default ToneMeter