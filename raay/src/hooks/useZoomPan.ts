// src/hooks/useZoomPan.ts

import { useState } from 'react'

const useZoomPan = () => {
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })

  const zoomIn = () => setZoom(prev => prev + 0.1)
  const zoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.1))
  const panMove = (x: number, y: number) => setPan({ x, y })

  return { zoom, pan, zoomIn, zoomOut, panMove }
}

export default useZoomPan
