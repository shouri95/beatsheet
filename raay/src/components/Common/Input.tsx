// src/components/Common/Input.tsx

"use client"

import React from 'react'
import { cn } from '../../utils/helpers'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input: React.FC<InputProps> = ({ className, ...props }) => {
  return (
    <input 
      className={cn(
        "block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500",
        className
      )} 
      {...props} 
    />
  )
}
