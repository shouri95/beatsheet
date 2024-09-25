import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SceneConnection {
  id: string;
  source: string;
  target: string;
}

interface SceneConnectionState {
  connections: SceneConnection[];
}

const initialState: SceneConnectionState = {
  connections: [],
};

const sceneConnectionsSlice = createSlice({
  name: 'sceneConnections',
  initialState,
  reducers: {
    addConnection: (state, action: PayloadAction<SceneConnection>) => {
      state.connections.push(action.payload);
    },
  },
});

export const { addConnection } = sceneConnectionsSlice.actions;
export default sceneConnectionsSlice.reducer;
