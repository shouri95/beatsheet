// src/store/uiSlice.ts

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type ConnectionType =
  | 'sequential'
  | 'nonLinear'
  | 'reference'
  | 'arc'
  | 'parallel'
  | 'thematic'
  | 'dialogue'
  | null;

interface UiState {
  connectionFilters: {
    [key in Exclude<ConnectionType, null>]: boolean;
  };
  connectionMode: boolean;
  activeConnectionType: ConnectionType;
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
  connectionMode: false,
  activeConnectionType: null,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleConnectionType: (state, action: PayloadAction<Exclude<ConnectionType, null>>) => {
      state.connectionFilters[action.payload] = !state.connectionFilters[action.payload];
    },
    resetConnectionFilters: (state) => {
      Object.keys(state.connectionFilters).forEach((key) => {
        state.connectionFilters[key as Exclude<ConnectionType, null>] = true;
      });
    },
    setConnectionMode: (state, action: PayloadAction<boolean>) => {
      state.connectionMode = action.payload;
      if (!action.payload) {
        state.activeConnectionType = null;
      }
    },
    setActiveConnectionType: (state, action: PayloadAction<ConnectionType>) => {
      state.activeConnectionType = action.payload;
      if (action.payload) {
        state.connectionMode = true;
      }
    },
  },
});

export const {
  toggleConnectionType,
  resetConnectionFilters,
  setConnectionMode,
  setActiveConnectionType,
} = uiSlice.actions;

export default uiSlice.reducer;