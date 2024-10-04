// src/store/scenesSlice.ts

import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit'
import { v4 as uuidv4 } from 'uuid';

interface Scene {
  id: string
  title: string
  scriptContent: string
  position: { x: number; y: number }
  size: { width: number; height: number }
  characters: string[]
  color: string
}

interface ScenesState {
  scenes: Scene[]
}

const initialState: ScenesState = {
  scenes: [],
}

// Async action for updating scene
export const updateSceneAsync = createAsyncThunk(
  'scenes/updateScene',
  async (updatedScene: { id: string; title: string; scriptContent: string }, thunkAPI) => {
    // Simulate API call or perform actual API integration here
    return new Promise<{ id: string; title: string; scriptContent: string }>((resolve) => {
      setTimeout(() => {
        resolve(updatedScene)
      }, 500)
    })
  }
)

const scenesSlice = createSlice({
  name: 'scenes',
  initialState,
  reducers: {
    addScene: (state, action: PayloadAction<Omit<Scene, 'id'>>) => {
      const newScene = {
        ...action.payload,
        id: uuidv4(), // Generate a unique ID
      };
      state.scenes.push(newScene);
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
    removeCharacterFromScene: (
      state,
      action: PayloadAction<{ sceneId: string; characterId: string }>
    ) => {
      const scene = state.scenes.find(scene => scene.id === action.payload.sceneId)
      if (scene) {
        scene.characters = scene.characters.filter(id => id !== action.payload.characterId)
      }
    },
    deleteScene: (state, action: PayloadAction<string>) => {
      console.log('Deleting scene in reducer:', action.payload);
      state.scenes = state.scenes.filter(scene => scene.id !== action.payload)
    },
    reorderScenes: (state, action: PayloadAction<string[]>) => {
      const newOrder = action.payload
      state.scenes = newOrder.map(id => state.scenes.find(scene => scene.id === id)!).filter(Boolean)
    },
  },
  extraReducers: (builder) => {
    builder.addCase(updateSceneAsync.fulfilled, (state, action) => {
      const scene = state.scenes.find(scene => scene.id === action.payload.id)
      if (scene) {
        scene.title = action.payload.title
        scene.scriptContent = action.payload.scriptContent
      }
    })
  },
})

export const {
  addScene,
  updateScenePosition,
  updateScene,
  assignCharacterToScene,
  removeCharacterFromScene,
  deleteScene,
  reorderScenes,
} = scenesSlice.actions

export default scenesSlice.reducer
