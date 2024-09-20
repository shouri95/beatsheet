"use client"

import React from 'react'
import { Tooltip as HeadlessTooltip } from '@headlessui/react'

interface TooltipProps {
  content: string
  children: React.ReactNode
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
  return (
    <HeadlessTooltip>
      <HeadlessTooltip.Button>
        {children}
      </HeadlessTooltip.Button>
      <HeadlessTooltip.Panel className="absolute z-10 p-2 bg-gray-700 text-white rounded-md">
        {content}
      </HeadlessTooltip.Panel>
    </HeadlessTooltip>
  )
}
