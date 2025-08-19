'use client'
import { useEffect, useRef } from 'react'
import {
  init,
  dispose,
  registerOverlay,
  type OverlayTemplate,
  type KLineData,
} from 'klinecharts'

export default function RiskRewardChart() {
  const chartRef = useRef<ReturnType<typeof init> | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // 1. Register overlay globally (must be done before init/CreateOverlay)
    registerOverlay({
      name: 'position',
      needDefaultPointFigure: true,
      totalStep: 3,
      createPointFigures: ({ coordinates, overlay }) => {
        if (coordinates.length < 3) return []
        const side = overlay.extendData?.side ?? 'long'
        const [entry, sl, tp] = coordinates
        const eY = entry.y, sY = sl.y, tY = tp.y
        const xL = entry.x - 40, xR = entry.x + 40
        const risk = Math.abs(sY - eY), reward = Math.abs(tY - eY)
        const rr = risk === 0 ? '∞' : (reward / risk).toFixed(2)

        const base = [
          {
            type: 'line',
            attrs: { coordinates: [{ x: xL, y: eY }, { x: xR, y: eY }] },
            styles: { color: 'blue', style: 'dashed' }
          },
          {
            type: 'text',
            attrs: { x: xL - 5, y: eY, text: 'Entry', align: 'right', baseline: 'middle' },
            styles: { fontSize: 12, color: 'blue' }
          },
          {
            type: 'text',
            attrs: { x: xR + 5, y: eY, text: `RRR ${rr}`, align: 'left', baseline: 'middle' },
            styles: { fontSize: 12, color: '#000', backgroundColor: '#fff' }
          }
        ]

        if (side === 'long') {
          base.push(
            {
              type: 'polygon',
              attrs: {
                coordinates: [{ x: xL, y: eY }, { x: xR, y: eY }, { x: xR, y: sY }, { x: xL, y: sY }],
              },
              styles: { style: 'fill', color: '#F4511E40' }
            },
            {
              type: 'text',
              attrs: { x: xL - 5, y: sY, text: 'SL', align: 'right', baseline: 'middle' },
              styles: { fontSize: 12, color: 'red' }
            },
            {
              type: 'polygon',
              attrs: {
                coordinates: [{ x: xL, y: eY }, { x: xR, y: eY }, { x: xR, y: tY }, { x: xL, y: tY }],
              },
              styles: { style: 'fill', color: '#7CB34240' }
            },
            {
              type: 'text',
              attrs: { x: xL - 5, y: tY, text: 'TP', align: 'right', baseline: 'middle' },
              styles: { fontSize: 12, color: 'green' }
            }
          )
        } else {
          base.push(
            {
              type: 'polygon',
              attrs: {
                coordinates: [{ x: xL, y: eY }, { x: xR, y: eY }, { x: xR, y: sY }, { x: xL, y: sY }],
              },
              styles: { style: 'fill', color: '#F4511E40' }
            },
            {
              type: 'text',
              attrs: { x: xL - 5, y: sY, text: 'SL', align: 'right', baseline: 'middle' },
              styles: { fontSize: 12, color: 'red' }
            },
            {
              type: 'polygon',
              attrs: {
                coordinates: [{ x: xL, y: eY }, { x: xR, y: eY }, { x: xR, y: tY }, { x: xL, y: tY }],
              },
              styles: { style: 'fill', color: '#7CB34240' }
            },
            {
              type: 'text',
              attrs: { x: xL - 5, y: tY, text: 'TP', align: 'right', baseline: 'middle' },
              styles: { fontSize: 12, color: 'green' }
            }
          )
        }

        return base
      }
    } as OverlayTemplate)

    // 2. Init chart
    chartRef.current = init('chart-container')

    // 3. Add placeholder candles
    const data: KLineData[] = Array.from({ length: 40 }, (_, i) => {
      const ts = Date.now() + i * 60000
      const o = 100 + Math.random() * 10
      const c = o + (Math.random() - 0.5) * 10
      return { timestamp: ts, open: o, high: Math.max(o, c) + 5, low: Math.min(o, c) - 5, close: c, volume: 0 }
    })
    chartRef.current.applyNewData(data)

    return () => dispose('chart-container')
  }, [])

  const addPosition = (side: 'long' | 'short') => {
    const last = chartRef.current?.getDataList().slice(-1)[0]
    if (!last) return
    chartRef.current?.createOverlay({
      name: 'position',
      extendData: { side },
      points: [
        { timestamp: last.timestamp, value: last.close },
        { timestamp: last.timestamp, value: side === 'long' ? last.close * 0.98 : last.close * 1.02 },
        { timestamp: last.timestamp, value: side === 'long' ? last.close * 1.05 : last.close * 0.95 },
      ],
    })
  }

  return (
    <div>
      <button onClick={() => addPosition('long')}>Long</button>
      <button onClick={() => addPosition('short')}>Short</button>
      <div id="chart-container" style={{ width: '100%', height: 500 }} />
    </div>
  )
}
