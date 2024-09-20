// src/components/Common/Button.tsx

"use client"

import React from 'react'
import { cn } from '../../utils/helpers'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary'
}

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', className, children, ...props }) => {
  const baseStyles = "px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 inline-flex items-center text-sm font-medium"
  const variantStyles = variant === 'primary' 
    ? "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500"
    : "bg-gray-200 text-gray-700 hover:bg-gray-300 focus:ring-gray-400"

  return (
    <button className={cn(baseStyles, variantStyles, className)} {...props}>
      {children}
    </button>
  )
}
