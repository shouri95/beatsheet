// src/components/UI/Portal.tsx

"use client"

import { ReactNode, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface PortalProps {
  children: ReactNode
}

const Portal: React.FC<PortalProps> = ({ children }) => {
  const [mounted, setMounted] = useState(false)
  const [container, setContainer] = useState<HTMLElement | null>(null)

  useEffect(() => {
    const portalRoot = document.getElementById('portal-root')
    if (portalRoot) {
      setContainer(portalRoot)
      setMounted(true)
    }
  }, [])

  if (!mounted || !container) return null

  return createPortal(children, container)
}

export default Portal
