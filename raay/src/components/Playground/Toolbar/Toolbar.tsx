// src/components/Playground/Toolbar/Toolbar.tsx

"use client"

import React from 'react'
import { useRouter } from 'next/navigation'

const Toolbar: React.FC = () => {
  const router = useRouter()

  const navigateToScreenplay = () => {
    router.push('/screenplay')
  }

  return (
    <div className="fixed top-0 left-0 w-full z-20 p-4">
      <div className="flex justify-between items-center font-sans text-black text-sm">
        <div className="flex space-x-6">
          RAAY {/* Removed [ADD SCENE], [ADD CHARACTER], and [Storyboard] buttons */}
        </div>
        <div className="flex space-x-4">
          <button onClick={navigateToScreenplay} className="hover:text-gray-600 transition-colors duration-300 font-bold">
            [VIEW SCREENPLAY]
          </button>
          <button className="hover:text-gray-600 transition-colors duration-300 font-bold">
            [ACCOUNT]
          </button>
        </div>
      </div>
    </div>
  )
}

export default Toolbar
