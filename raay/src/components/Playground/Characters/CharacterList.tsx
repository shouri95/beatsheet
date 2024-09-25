import React, { useRef } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../../../store'
import { useDrag } from 'react-dnd'
import { UserIcon } from '@heroicons/react/24/outline'

interface CharacterItemProps {
  id: string
  name: string
}

const CharacterItem: React.FC<CharacterItemProps> = ({ id, name }) => {
  const ref = useRef<HTMLDivElement>(null)
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'CHARACTER',
    item: { id, name },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }))

  // Use drag to set up the ref
  drag(ref)

  return (
    <div
      ref={ref}
      className={`flex items-center p-2 mb-2 bg-white rounded-md shadow-sm cursor-move ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <UserIcon className="h-5 w-5 mr-2 text-blue-500" />
      <span>{name}</span>
    </div>
  )
}

const CharacterList: React.FC = () => {
  const characters = useSelector((state: RootState) => state.characters.characters)

  return (
    <div className="mt-4">
      <h3 className="text-lg font-semibold mb-2">Characters</h3>
      <div className="space-y-2">
        {characters.map((character) => (
          <CharacterItem key={character.id} id={character.id} name={character.name} />
        ))}
      </div>
    </div>
  )
}

export default CharacterList