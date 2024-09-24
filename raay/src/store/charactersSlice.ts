// src/store/charactersSlice.ts

import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface Character {
  id: string
  name: string
  description: string
}

interface CharactersState {
  characters: Character[]
}

const initialState: CharactersState = {
  characters: [],
}

const charactersSlice = createSlice({
  name: 'characters',
  initialState,
  reducers: {
    addCharacter: (state, action: PayloadAction<Character>) => {
      state.characters.push(action.payload)
    },
    updateCharacter: (state, action: PayloadAction<{ id: string; name?: string; description?: string }>) => {
      const character = state.characters.find(char => char.id === action.payload.id)
      if (character) {
        if (action.payload.name !== undefined) character.name = action.payload.name
        if (action.payload.description !== undefined) character.description = action.payload.description
      }
    },
    deleteCharacter: (state, action: PayloadAction<string>) => {
      state.characters = state.characters.filter(char => char.id !== action.payload)
    },
    // Define more reducers as needed
  },
})

export const { addCharacter, updateCharacter, deleteCharacter } = charactersSlice.actions
export default charactersSlice.reducer
