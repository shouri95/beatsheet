// src/app/layout.tsx

"use client"

import './globals.css'
import type { ReactNode } from 'react'
import { Provider } from 'react-redux'
import store from '../store'
import ErrorBoundary from '../components/ErrorBoundary'

interface RootLayoutProps {
  children: ReactNode
}

const RootLayout = ({ children }: RootLayoutProps) => {
  return (
    <html lang="en">
      <body>
        <Provider store={store}>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </Provider>
      </body>
    </html>
  )
}

export default RootLayout
