"use client"

import React, { createContext, useState, ReactNode, useContext } from 'react'

// Define the shape of the context
interface ModalContextProps {
  isOpen: boolean
  openModal: () => void
  closeModal: () => void
}

// Create the context with default undefined
const ModalContext = createContext<ModalContextProps | undefined>(undefined)

// Create a provider component
export const ModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false)

  const openModal = () => setIsOpen(true)
  const closeModal = () => setIsOpen(false)

  return (
    <ModalContext.Provider value={{ isOpen, openModal, closeModal }}>
      {children}
    </ModalContext.Provider>
  )
}

// Custom hook for consuming the context
export const useModal = (): ModalContextProps => {
  const context = useContext(ModalContext)
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider')
  }
  return context
}
