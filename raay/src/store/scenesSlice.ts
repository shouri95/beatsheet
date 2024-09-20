// src/store/scenesSlice.ts

import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface Scene {
  id: string
  title: string
  scriptContent: string
  position: { x: number; y: number }
  size: { width: number; height: number }
  characters: string[]
  props: string[]
  color: string
}

interface ScenesState {
  scenes: Scene[]
}

const initialState: ScenesState = {
  scenes: [],
}

const scenesSlice = createSlice({
  name: 'scenes',
  initialState,
  reducers: {
    addScene: (state, action: PayloadAction<Scene>) => {
      state.scenes.push(action.payload)
    },
    updateScenePosition: (
      state,
      action: PayloadAction<{ id: string; position: { x: number; y: number } }>
    ) => {
      const scene = state.scenes.find(scene => scene.id === action.payload.id)
      if (scene) {
        scene.position = action.payload.position
      }
    },
    updateScene: (
      state,
      action: PayloadAction<{ id: string; title: string; scriptContent: string }>
    ) => {
      const scene = state.scenes.find(scene => scene.id === action.payload.id)
      if (scene) {
        scene.title = action.payload.title
        scene.scriptContent = action.payload.scriptContent
      }
    },
    assignCharacterToScene: (
      state,
      action: PayloadAction<{ sceneId: string; characterId: string }>
    ) => {
      const scene = state.scenes.find(scene => scene.id === action.payload.sceneId)
      if (scene && !scene.characters.includes(action.payload.characterId)) {
        scene.characters.push(action.payload.characterId)
      }
    },
    assignPropToScene: (
      state,
      action: PayloadAction<{ sceneId: string; propId: string }>
    ) => {
      const scene = state.scenes.find(scene => scene.id === action.payload.sceneId)
      if (scene && !scene.props.includes(action.payload.propId)) {
        scene.props.push(action.payload.propId)
      }
    },
    // Optional: Remove Scene, etc.
  },
})

export const {
  addScene,
  updateScenePosition,
  updateScene,
  assignCharacterToScene,
  assignPropToScene,
} = scenesSlice.actions
export default scenesSlice.reducer
