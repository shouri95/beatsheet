"use client"

import React from 'react'
import { cn } from '../../utils/helpers'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Card: React.FC<CardProps> = ({ className, children, ...props }) => {
  return (
    <div className={cn("bg-white shadow rounded p-4", className)} {...props}>
      {children}
    </div>
  )
}
