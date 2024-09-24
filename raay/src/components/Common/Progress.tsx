// src/components/Common/Progress.tsx

"use client"

import React from 'react'

interface ProgressProps {
  value: number
  max: number
}

export const Progress: React.FC<ProgressProps> = ({ value, max }) => {
  const percentage = Math.min((value / max) * 100, 100)

  return (
    <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
      <div
        className="bg-blue-600 h-2.5 rounded-full"
        style={{ width: `${percentage}%` }}
      ></div>
    </div>
  )
}
