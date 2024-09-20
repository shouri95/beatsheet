"use client"

import React from 'react'

interface ProgressProps {
  value: number
  max: number
}

export const Progress: React.FC<ProgressProps> = ({ value, max }) => {
  const percentage = (value / max) * 100
  return (
    <div className="w-32 h-4 bg-gray-300 rounded-full">
      <div
        className="h-full bg-green-500 rounded-full"
        style={{ width: `${percentage}%` }}
      ></div>
    </div>
  )
}
