import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface UiState {
  // Define state properties
}

const initialState: UiState = {
  // Initialize state
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // Define reducers
  },
})

export const { } = uiSlice.actions
export default uiSlice.reducer
