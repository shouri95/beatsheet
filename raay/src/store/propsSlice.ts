// src/store/propsSlice.ts

import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface Prop {
  id: string
  name: string
  description: string
}

interface PropsState {
  props: Prop[]
}

const initialState: PropsState = {
  props: [],
}

const propsSlice = createSlice({
  name: 'props',
  initialState,
  reducers: {
    addProp: (state, action: PayloadAction<Prop>) => {
      state.props.push(action.payload)
    },
    updateProp: (state, action: PayloadAction<{ id: string; name?: string; description?: string }>) => {
      const prop = state.props.find(p => p.id === action.payload.id)
      if (prop) {
        if (action.payload.name !== undefined) prop.name = action.payload.name
        if (action.payload.description !== undefined) prop.description = action.payload.description
      }
    },
    deleteProp: (state, action: PayloadAction<string>) => {
      state.props = state.props.filter(p => p.id !== action.payload)
    },
    // Define more reducers as needed
  },
})

export const { addProp, updateProp, deleteProp } = propsSlice.actions
export default propsSlice.reducer
