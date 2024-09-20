// src/components/Playground/CharacterCard.tsx

import React from 'react'
import { useDrag } from 'react-dnd'
import { Card } from '../Common/Card'

interface CharacterCardProps {
  character: {
    id: string
    name: string
    description: string
  }
}

const CharacterCard: React.FC<CharacterCardProps> = ({ character }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'CHARACTER',
    item: { id: character.id, type: 'CHARACTER' },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }))

  return (
    <div
      ref={drag as unknown as React.Ref<HTMLDivElement>}
      className={`bg-blue-100 p-2 rounded-md mb-2 cursor-pointer ${
        isDragging ? 'opacity-50' : 'opacity-100'
      }`}
    >
      <h5 className="text-sm font-medium">{character.name}</h5>
    </div>
  )
}

export default CharacterCard
