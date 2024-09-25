// src/store/connectionsSlice.ts

import { createSlice, PayloadAction } from '@reduxjs/toolkit'

type ConnectionType = 'sequential' | 'nonLinear' | 'reference' | 'arc' | 'parallel' | 'thematic'

interface Connection {
  from: string
  to: string
  type: ConnectionType
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
      // Prevent duplicate connections
      const exists = state.connections.some(
        (conn) => conn.from === action.payload.from && conn.to === action.payload.to
      )
      if (!exists) {
        state.connections.push(action.payload)
      }
    },
    deleteConnection: (state, action: PayloadAction<{ from: string; to: string }>) => {
      state.connections = state.connections.filter(
        (conn) => !(conn.from === action.payload.from && conn.to === action.payload.to)
      )
    },
    // Add more reducers if needed
  },
})

export const { addConnection, deleteConnection } = connectionsSlice.actions
export default connectionsSlice.reducer
