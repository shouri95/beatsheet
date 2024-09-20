// src/store/connectionsSlice.ts

import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface Connection {
  from: string
  to: string
}

interface ConnectionsState {
  connections: Connection[]
}

const initialState: ConnectionsState = {
  connections: [],
}

const connectionsSlice = createSlice({
  name: 'connections',
  initialState,
  reducers: {
    addConnection: (state, action: PayloadAction<Connection>) => {
      state.connections.push(action.payload)
    },
    // Add more reducers if needed
  },
})

export const { addConnection } = connectionsSlice.actions
export default connectionsSlice.reducer
