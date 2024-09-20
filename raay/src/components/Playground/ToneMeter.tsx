"use client"

import React from 'react'
import { Progress } from '../Common/Progress'

interface ToneMeterProps {
  currentToneScore: number
  desiredToneScore: number
}

const ToneMeter: React.FC<ToneMeterProps> = ({ currentToneScore, desiredToneScore }) => {
  return (
    <div className="fixed bottom-0 right-0 p-4">
      <Progress value={currentToneScore} max={desiredToneScore} />
      <span className="text-sm">Tone Consistency</span>
    </div>
  )
}

export default ToneMeter
