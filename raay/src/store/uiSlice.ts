// src/store/uiSlice.ts

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type ConnectionType =
  | 'sequential'
  | 'nonLinear'
  | 'reference'
  | 'arc'
  | 'parallel'
  | 'thematic'
  | 'dialogue';

interface UiState {
  connectionFilters: {
    [key in ConnectionType]: boolean;
  };
  connectionMode: {
    isActive: boolean;
    sourceSceneId: string | null;
  };
}

const initialState: UiState = {
  connectionFilters: {
    sequential: true,
    nonLinear: true,
    reference: true,
    arc: true,
    parallel: true,
    thematic: true,
    dialogue: true,
  },
  connectionMode: {
    isActive: false,
    sourceSceneId: null,
  },
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleConnectionType: (state, action: PayloadAction<ConnectionType>) => {
      state.connectionFilters[action.payload] = !state.connectionFilters[action.payload];
    },
    resetConnectionFilters: (state) => {
      Object.keys(state.connectionFilters).forEach((key) => {
        state.connectionFilters[key as ConnectionType] = true;
      });
    },
    exitConnectionMode: (state) => {
      state.connectionMode.isActive = false;
      state.connectionMode.sourceSceneId = null;
    },
  },
});

export const { toggleConnectionType, resetConnectionFilters, exitConnectionMode } = uiSlice.actions;
export default uiSlice.reducer;