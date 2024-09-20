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
    // Define more reducers as needed
  },
})

export const { addProp } = propsSlice.actions
export default propsSlice.reducer
