// src/store/beatSheetSlice.ts

import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface Beat {
  id: string
  title: string
  description: string
}

interface BeatSheetState {
  beats: Beat[]
}

const initialState: BeatSheetState = {
  beats: []
}

const beatSheetSlice = createSlice({
  name: 'beatSheet',
  initialState,
  reducers: {
    addBeat: (state, action: PayloadAction<Beat>) => {
      state.beats.push(action.payload)
    },
    updateBeat: (state, action: PayloadAction<Beat>) => {
      const index = state.beats.findIndex(beat => beat.id === action.payload.id)
      if (index !== -1) {
        state.beats[index] = action.payload
      }
    },
    deleteBeat: (state, action: PayloadAction<string>) => {
      state.beats = state.beats.filter(beat => beat.id !== action.payload)
    }
  }
})

export const { addBeat, updateBeat, deleteBeat } = beatSheetSlice.actions
export default beatSheetSlice.reducer