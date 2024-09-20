#!/bin/bash

# setup_project.sh
# This script sets up the Raay project with React, Next.js, and essential dependencies.

# Exit immediately if a command exits with a non-zero status.
set -e

# Function to display messages
function echo_msg() {
    echo -e "\n\033[1;34m$1\033[0m\n"
}

# Function to check if a command exists
function command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check for Node.js and npm
if ! command_exists node; then
    echo_msg "Node.js is not installed. Please install Node.js and try again."
    exit 1
fi

if ! command_exists npm; then
    echo_msg "npm is not installed. Please install npm and try again."
    exit 1
fi

# Check for Git
if ! command_exists git; then
    echo_msg "Git is not installed. Please install Git and try again."
    exit 1
fi

# Project name (lowercase to comply with npm naming conventions)
PROJECT_NAME="raay"

# Directory setup
if [ -d "$PROJECT_NAME" ]; then
    echo_msg "Directory '$PROJECT_NAME' already exists. Please choose a different project name or remove the existing directory."
    exit 1
fi

# Create Next.js app using the 'app' directory structure with TypeScript and Tailwind CSS
echo_msg "Creating Next.js application with TypeScript and Tailwind CSS..."
npx create-next-app@latest "$PROJECT_NAME" --typescript --tailwind --use-npm --app

cd "$PROJECT_NAME"

# Install additional dependencies (excluding Shadcn UI)
echo_msg "Installing additional dependencies..."
npm install @headlessui/react @heroicons/react react-dnd react-dnd-html5-backend reactflow react-resizable react-zoom-pan-pinch quill react-quill

# Create project structure
echo_msg "Creating project structure..."
mkdir -p src/components/Playground
mkdir -p src/components/Dashboard
mkdir -p src/components/Common
mkdir -p src/store
mkdir -p src/utils
mkdir -p src/hooks

# Create Playground components
echo_msg "Creating Playground components..."

cat > src/components/Playground/PlaygroundCanvas.tsx <<EOL
"use client"

import React from 'react'
import SceneBox from './SceneBox'
import CharacterCard from './CharacterCard'
import PropItem from './PropItem'
import ConnectionLine from './ConnectionLine'
import Toolbar from './Toolbar'
import ToneMeter from './ToneMeter'
import BeatSheet from './BeatSheet'

const PlaygroundCanvas: React.FC = () => {
  return (
    <div className="relative w-full h-full">
      <Toolbar />
      {/* Render SceneBoxes, CharacterCards, Props, Connections here */}
      <SceneBox sceneId="scene-1" title="Opening Scene" scriptContent="This is the opening scene." />
      <CharacterCard characterId="char-1" name="Protagonist" description="Main character" />
      <PropItem propId="prop-1" name="Key" description="A mysterious key" />
      <ConnectionLine fromSceneId="scene-1" toSceneId="scene-2" />
      <ToneMeter currentToneScore={80} desiredToneScore={100} />
      <BeatSheet />
    </div>
  )
}

export default PlaygroundCanvas
EOL

cat > src/components/Playground/SceneBox.tsx <<EOL
"use client"

import React from 'react'
import { Card } from '../Common/Card'

interface SceneBoxProps {
  sceneId: string
  title: string
  scriptContent: string
  // Add other props as needed
}

const SceneBox: React.FC<SceneBoxProps> = ({ sceneId, title, scriptContent }) => {
  return (
    <Card className="absolute top-20 left-20 w-64 h-32">
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="text-sm">{scriptContent}</p>
      {/* Add drag handle, resize handles, etc. */}
    </Card>
  )
}

export default SceneBox
EOL

cat > src/components/Playground/CharacterCard.tsx <<EOL
"use client"

import React from 'react'
import { Card } from '../Common/Card'

interface CharacterCardProps {
  characterId: string
  name: string
  description: string
}

const CharacterCard: React.FC<CharacterCardProps> = ({ characterId, name, description }) => {
  return (
    <Card className="m-2">
      <h4 className="text-md font-semibold">{name}</h4>
      <p className="text-xs">{description}</p>
      {/* Add drag functionality */}
    </Card>
  )
}

export default CharacterCard
EOL

cat > src/components/Playground/PropItem.tsx <<EOL
"use client"

import React from 'react'
import { Card } from '../Common/Card'

interface PropItemProps {
  propId: string
  name: string
  description: string
}

const PropItem: React.FC<PropItemProps> = ({ propId, name, description }) => {
  return (
    <Card className="m-2">
      <h5 className="text-sm font-medium">{name}</h5>
      <p className="text-xs">{description}</p>
      {/* Add drag functionality */}
    </Card>
  )
}

export default PropItem
EOL

cat > src/components/Playground/ConnectionLine.tsx <<EOL
"use client"

import React from 'react'

interface ConnectionLineProps {
  fromSceneId: string
  toSceneId: string
}

const ConnectionLine: React.FC<ConnectionLineProps> = ({ fromSceneId, toSceneId }) => {
  // Implement connection line rendering using reactflow or d3.js
  return (
    <svg className="absolute w-full h-full pointer-events-none">
      <line x1="100" y1="100" x2="300" y2="300" stroke="black" />
      {/* Dynamic coordinates based on scene positions */}
    </svg>
  )
}

export default ConnectionLine
EOL

cat > src/components/Playground/Toolbar.tsx <<EOL
"use client"

import React from 'react'
import { Button } from '../Common/Button'

const Toolbar: React.FC = () => {
  return (
    <div className="fixed top-0 left-0 w-full flex space-x-4 p-4 bg-white shadow-md z-10">
      <Button variant="primary">Add Scene</Button>
      <Button variant="secondary">Add Character</Button>
      <Button variant="secondary">Add Prop</Button>
      {/* Add more toolbar buttons as needed */}
    </div>
  )
}

export default Toolbar
EOL

cat > src/components/Playground/ToneMeter.tsx <<EOL
"use client"

import React from 'react'
import { Progress } from '../Common/Progress'

interface ToneMeterProps {
  currentToneScore: number
  desiredToneScore: number
}

const ToneMeter: React.FC<ToneMeterProps> = ({ currentToneScore, desiredToneScore }) => {
  return (
    <div className="fixed bottom-0 right-0 p-4">
      <Progress value={currentToneScore} max={desiredToneScore} />
      <span className="text-sm">Tone Consistency</span>
    </div>
  )
}

export default ToneMeter
EOL

cat > src/components/Playground/BeatSheet.tsx <<EOL
"use client"

import React from 'react'

const BeatSheet: React.FC = () => {
  return (
    <div className="fixed right-0 top-0 w-1/4 h-full bg-white p-4 overflow-auto">
      <h2 className="text-xl font-bold mb-4">Beat Sheet</h2>
      {/* Render beat sheet items here */}
      <ul className="list-disc list-inside">
        <li>Opening Scene</li>
        <li>Inciting Incident</li>
        <li>Midpoint</li>
        <li>Climax</li>
        <li>Resolution</li>
      </ul>
    </div>
  )
}

export default BeatSheet
EOL

# Create Dashboard components
echo_msg "Creating Dashboard components..."

cat > src/components/Dashboard/DashboardOverview.tsx <<EOL
"use client"

import React from 'react'
import StatsWidget from './StatsWidget'
import RecentActivity from './RecentActivity'

const DashboardOverview: React.FC = () => {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatsWidget />
        <RecentActivity />
      </div>
    </div>
  )
}

export default DashboardOverview
EOL

cat > src/components/Dashboard/StatsWidget.tsx <<EOL
"use client"

import React from 'react'
import { Card } from '../Common/Card'

const StatsWidget: React.FC = () => {
  return (
    <Card>
      <h3 className="text-lg font-semibold">Project Statistics</h3>
      <ul className="list-disc list-inside mt-2">
        <li>Scenes: 10</li>
        <li>Characters: 5</li>
        <li>Props: 8</li>
        <li>Tone Consistency: 80%</li>
        <!-- Add more stats as needed -->
      </ul>
    </Card>
  )
}

export default StatsWidget
EOL

cat > src/components/Dashboard/RecentActivity.tsx <<EOL
"use client"

import React from 'react'
import { Card } from '../Common/Card'

const RecentActivity: React.FC = () => {
  return (
    <Card>
      <h3 className="text-lg font-semibold">Recent Activity</h3>
      <ul className="list-disc list-inside mt-2">
        <li>Added new scene: Opening</li>
        <li>Updated character: Protagonist</li>
        <li>Assigned prop: Key to Scene 2</li>
        <!-- Add more activities as needed -->
      </ul>
    </Card>
  )
}

export default RecentActivity
EOL

# Create Common components
echo_msg "Creating Common components..."

cat > src/components/Common/Button.tsx <<EOL
"use client"

import React from 'react'
import { cn } from '../../utils/helpers'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary'
}

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', className, children, ...props }) => {
  const baseStyles = "px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2"
  const variantStyles = variant === 'primary' 
    ? "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500"
    : "bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-500"

  return (
    <button className={cn(baseStyles, variantStyles, className)} {...props}>
      {children}
    </button>
  )
}
EOL

cat > src/components/Common/Card.tsx <<EOL
"use client"

import React from 'react'
import { cn } from '../../utils/helpers'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Card: React.FC<CardProps> = ({ className, children, ...props }) => {
  return (
    <div className={cn("bg-white shadow rounded p-4", className)} {...props}>
      {children}
    </div>
  )
}
EOL

cat > src/components/Common/Input.tsx <<EOL
"use client"

import React from 'react'
import { cn } from '../../utils/helpers'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input: React.FC<InputProps> = ({ className, ...props }) => {
  return (
    <input 
      className={cn(
        "border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500",
        className
      )} 
      {...props} 
    />
  )
}
EOL

cat > src/components/Common/Tooltip.tsx <<EOL
"use client"

import React from 'react'
import { Tooltip as HeadlessTooltip } from '@headlessui/react'

interface TooltipProps {
  content: string
  children: React.ReactNode
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
  return (
    <HeadlessTooltip>
      <HeadlessTooltip.Button>
        {children}
      </HeadlessTooltip.Button>
      <HeadlessTooltip.Panel className="absolute z-10 p-2 bg-gray-700 text-white rounded-md">
        {content}
      </HeadlessTooltip.Panel>
    </HeadlessTooltip>
  )
}
EOL

# Create Progress component for ToneMeter
echo_msg "Creating Progress component..."

cat > src/components/Common/Progress.tsx <<EOL
"use client"

import React from 'react'

interface ProgressProps {
  value: number
  max: number
}

export const Progress: React.FC<ProgressProps> = ({ value, max }) => {
  const percentage = (value / max) * 100
  return (
    <div className="w-32 h-4 bg-gray-300 rounded-full">
      <div
        className="h-full bg-green-500 rounded-full"
        style={{ width: \`\${percentage}%\` }}
      ></div>
    </div>
  )
}
EOL

# Create Redux store setup using Redux Toolkit
echo_msg "Setting up Redux store..."

npm install @reduxjs/toolkit react-redux

cat > src/store/index.ts <<EOL
import { configureStore } from '@reduxjs/toolkit'
import scenesReducer from './scenesSlice'
import charactersReducer from './charactersSlice'
import propsReducer from './propsSlice'
import connectionsReducer from './connectionsSlice'
import uiReducer from './uiSlice'

const store = configureStore({
  reducer: {
    scenes: scenesReducer,
    characters: charactersReducer,
    props: propsReducer,
    connections: connectionsReducer,
    ui: uiReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export default store
EOL

# Create placeholder slices
echo_msg "Creating Redux slices..."

for slice in scenes characters props connections ui
do
  cat > src/store/${slice}Slice.ts <<EOL
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface ${slice^}State {
  // Define state properties
}

const initialState: ${slice^}State = {
  // Initialize state
}

const ${slice}Slice = createSlice({
  name: '${slice}',
  initialState,
  reducers: {
    // Define reducers
  },
})

export const { } = ${slice}Slice.actions
export default ${slice}Slice.reducer
EOL
done

# Create utility helper for classNames
echo_msg "Creating utility helpers..."

cat > src/utils/helpers.ts <<EOL
export function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}
EOL

# Create API utility
cat > src/utils/api.ts <<EOL
// Placeholder for API functions
EOL

# Create constants file
cat > src/utils/constants.ts <<EOL
// Define application constants here
EOL

# Create custom hooks
echo_msg "Creating custom hooks..."

cat > src/hooks/useDragAndDrop.ts <<EOL
import { useDrag, useDrop } from 'react-dnd'

const useDragAndDrop = () => {
  // Implement custom drag and drop logic
}

export default useDragAndDrop
EOL

cat > src/hooks/useZoomPan.ts <<EOL
import { useState } from 'react'

const useZoomPan = () => {
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })

  const zoomIn = () => setZoom(prev => prev + 0.1)
  const zoomOut = () => setZoom(prev => prev - 0.1)
  const panMove = (x: number, y: number) => setPan({ x, y })

  return { zoom, pan, zoomIn, zoomOut, panMove }
}

export default useZoomPan
EOL

# Create layout.tsx to include Redux Provider
echo_msg "Configuring Redux Provider in layout.tsx..."

cat > src/app/layout.tsx <<EOL
"use client"

import '../styles/globals.css'
import type { ReactNode } from 'react'
import { Provider } from 'react-redux'
import store from '../store'

interface RootLayoutProps {
  children: ReactNode
}

const RootLayout = ({ children }: RootLayoutProps) => {
  return (
    <html lang="en">
      <body>
        <Provider store={store}>
          {children}
        </Provider>
      </body>
    </html>
  )
}

export default RootLayout
EOL

# Create Playground page
echo_msg "Creating Playground page..."

mkdir -p src/app/playground

cat > src/app/playground/page.tsx <<EOL
"use client"

import React from 'react'
import PlaygroundCanvas from '../../components/Playground/PlaygroundCanvas'

const Playground: React.FC = () => {
  return (
    <div className="w-full h-screen">
      <PlaygroundCanvas />
    </div>
  )
}

export default Playground
EOL

# Create Dashboard page
echo_msg "Creating Dashboard page..."

mkdir -p src/app/dashboard

cat > src/app/dashboard/page.tsx <<EOL
"use client"

import React from 'react'
import DashboardOverview from '../../components/Dashboard/DashboardOverview'

const Dashboard: React.FC = () => {
  return (
    <div className="w-full h-screen">
      <DashboardOverview />
    </div>
  )
}

export default Dashboard
EOL

# Update Home page to navigate correctly
echo_msg "Updating Home page..."

cat > src/app/page.tsx <<EOL
"use client"

import React from 'react'
import { Button } from '../components/Common/Button'
import { useRouter } from 'next/navigation'

const Home: React.FC = () => {
  const router = useRouter()

  const handleStart = () => {
    router.push('/playground')
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-4xl font-bold mb-8">Welcome to Raay</h1>
      <Button onClick={handleStart} variant="primary">Start Your Playground</Button>
    </div>
  )
}

export default Home
EOL

# Final message
echo_msg "Project setup complete! Proceeding to Shadcn UI setup."

echo_msg "Please run the 'setup_shadcn_ui.sh' script to initialize Shadcn UI."
