// src/components/Common/ThemeToggle.tsx

"use client"

import React, { useState, useEffect } from 'react'
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline'

const ThemeToggle: React.FC = () => {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDark])

  return (
    <button onClick={() => setIsDark(!isDark)} className="p-2 rounded-md focus:outline-none">
      {isDark ? <SunIcon className="h-6 w-6 text-yellow-400" /> : <MoonIcon className="h-6 w-6 text-gray-800" />}
    </button>
  )
}

export default ThemeToggle
