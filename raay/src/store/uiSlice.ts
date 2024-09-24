// src/store/uiSlice.ts

import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface UiState {
  // Define state properties as needed
}

const initialState: UiState = {
  // Initialize state properties
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // Define reducers as needed
  },
})

export const { } = uiSlice.actions
export default uiSlice.reducer
