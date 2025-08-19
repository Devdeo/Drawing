'use client'
import { useEffect, useRef } from 'react'
import {
  init,
  dispose,
  registerOverlay,
  type OverlayTemplate,
  type KLineData,
} from 'klinecharts'

export default function ShapeChart() {
  const chartRef = useRef<ReturnType<typeof init> | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    /** ─── Rectangle ─── */
    registerOverlay({
      name: 'rectangle',
      totalStep: 1, // one click only
      needDefaultPointFigure: true,
      // one click → full rectangle, then resize/drag via handlers
      createPointFigures: ({ coordinates }) => {
        if (coordinates.length < 1) return []
        const [p] = coordinates
        // create default opposite corner
        const p2 = { x: p.x + 80, y: p.y + 60 }
        return [
          {
            type: 'polygon',
            attrs: { coordinates: [p, { x: p2.x, y: p.y }, p2, { x: p.x, y: p2.y }] },
            styles: { style: 'stroke_fill', color: '#4A90E280' }
          }
        ]
      }
    } as OverlayTemplate)

    /** ─── Rotated Rectangle ─── */
    registerOverlay({
      name: 'rotated-rectangle',
      totalStep: 1,
      needDefaultPointFigure: true,
      createPointFigures: ({ coordinates }) => {
        if (coordinates.length < 1) return []
        const [p] = coordinates
        const width = 100, height = 50, angle = Math.PI / 6 // 30°
        const corners = [
          { x: 0, y: 0 },
          { x: width, y: 0 },
          { x: width, y: height },
          { x: 0, y: height },
        ].map(pt => ({
          x: p.x + pt.x * Math.cos(angle) - pt.y * Math.sin(angle),
          y: p.y + pt.x * Math.sin(angle) + pt.y * Math.cos(angle),
        }))
        return [
          {
            type: 'polygon',
            attrs: { coordinates: corners },
            styles: { style: 'stroke_fill', color: '#FF980080' }
          }
        ]
      }
    } as OverlayTemplate)

    /** ─── Circle ─── */
    registerOverlay({
      name: 'circle',
      totalStep: 1,
      needDefaultPointFigure: true,
      createPointFigures: ({ coordinates }) => {
        if (coordinates.length < 1) return []
        const [c] = coordinates
        const r = 40
        return [
          {
            type: 'circle',
            attrs: { x: c.x, y: c.y, r },
            styles: { style: 'stroke_fill', color: '#7CB34280' }
          }
        ]
      }
    } as OverlayTemplate)

    /** ─── Triangle ─── */
    registerOverlay({
      name: 'triangle',
      totalStep: 1,
      needDefaultPointFigure: true,
      createPointFigures: ({ coordinates }) => {
        if (coordinates.length < 1) return []
        const [p] = coordinates
        const size = 80
        const p2 = { x: p.x + size, y: p.y }
        const apex = { x: p.x + size / 2, y: p.y - size * 0.866 }
        return [
          {
            type: 'polygon',
            attrs: { coordinates: [p, p2, apex] },
            styles: { style: 'stroke_fill', color: '#E91E6380' }
          }
        ]
      }
    } as OverlayTemplate)

    // Init chart
    chartRef.current = init('chart-container')

    // Add placeholder data
    const data: KLineData[] = Array.from({ length: 60 }, (_, i) => {
      const ts = Date.now() + i * 60000
      const o = 100 + Math.random() * 5
      const c = o + (Math.random() - 0.5) * 5
      return {
        timestamp: ts,
        open: o,
        high: Math.max(o, c) + 3,
        low: Math.min(o, c) - 3,
        close: c,
        volume: 0,
      }
    })
    chartRef.current.applyNewData(data)

    return () => dispose('chart-container')
  }, [])

  /** create overlay: one click places whole shape */
  const addShape = (name: string) => {
    chartRef.current?.createOverlay({
      name,
      styles: {
        // enable editing
        point: { show: true, activeSize: 6, inactiveSize: 4 },
      }
    })
  }

  return (
    <div>
      <button onClick={() => addShape('rectangle')}>Rectangle</button>
      <button onClick={() => addShape('rotated-rectangle')}>Rotated Rect</button>
      <button onClick={() => addShape('circle')}>Circle</button>
      <button onClick={() => addShape('triangle')}>Triangle</button>
      <div id="chart-container" style={{ width: '100%', height: 500 }} />
    </div>
  )
}
