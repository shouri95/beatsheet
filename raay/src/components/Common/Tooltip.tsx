// src/components/Common/Tooltip.tsx

import React from 'react'
import { Transition } from '@headlessui/react'

export interface TooltipProps {
  content: string
  children: React.ReactNode
  visible?: boolean
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, visible = true }) => {
  return (
    <div className="relative">
      {children}
      <Transition
        show={visible}
        enter="transition ease-out duration-200"
        enterFrom="opacity-0 translate-y-1"
        enterTo="opacity-100 translate-y-0"
        leave="transition ease-in duration-150"
        leaveFrom="opacity-100 translate-y-0"
        leaveTo="opacity-0 translate-y-1"
      >
        <div className="absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-max">
          <div className="overflow-hidden rounded-lg shadow-lg ring-1 ring-black ring-opacity-5">
            <div className="bg-gray-700 p-2">
              <p className="text-sm text-white">{content}</p>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  )
}