// src/store/index.ts

import { configureStore } from '@reduxjs/toolkit'
import scenesReducer from './scenesSlice'
import charactersReducer from './charactersSlice'
import propsReducer from './propsSlice'
import connectionsReducer from './connectionsSlice'
import uiReducer from './uiSlice'
import beatSheetReducer from './beatSheetSlice'

const store = configureStore({
  reducer: {
    scenes: scenesReducer,
    characters: charactersReducer,
    props: propsReducer,
    connections: connectionsReducer,
    ui: uiReducer,
    beatSheet: beatSheetReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export default store