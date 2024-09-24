// src/components/Playground/CharacterCard.tsx
"use client"

import React, { useRef } from 'react'
import { useDrag } from 'react-dnd'
import { Card } from '../Common/Card'

interface CharacterCardProps {
  character: {
    id: string
    name: string
    description: string
  }
}

interface DragItem {
  id: string
  type: string
}

const CharacterCard: React.FC<CharacterCardProps> = ({ character }) => {
  const ref = useRef<HTMLDivElement>(null)
  const [{ isDragging }, drag] = useDrag<DragItem, void, { isDragging: boolean }>(() => ({
    type: 'CHARACTER',
    item: { id: character.id, type: 'CHARACTER' },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }), [character.id])

  // Apply the drag ref to the div ref
  drag(ref)

  return (
    <div
      ref={ref}
      className={`bg-blue-100 p-2 rounded-md mb-2 cursor-pointer ${
        isDragging ? 'opacity-50' : 'opacity-100'
      }`}
    >
      <h5 className="text-sm font-medium">{character.name}</h5>
    </div>
  )
}

export default CharacterCard