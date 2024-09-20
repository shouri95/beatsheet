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
    // Define more reducers as needed
  },
})

export const { addCharacter } = charactersSlice.actions
export default charactersSlice.reducer
