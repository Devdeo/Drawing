"use client";
import { useEffect, useRef } from "react";
import {
  init,
  dispose,
  type KLineChart,
  type KLineData,
} from "klinecharts";

// --- Demo data ---
const sampleData: KLineData[] = [
  { timestamp: 1723872000000, open: 100, high: 110, low: 95, close: 105, volume: 1200 },
  { timestamp: 1723958400000, open: 105, high: 115, low: 100, close: 112, volume: 900 },
  { timestamp: 1724044800000, open: 112, high: 118, low: 108, close: 115, volume: 1500 },
  { timestamp: 1724131200000, open: 115, high: 120, low: 110, close: 111, volume: 700 },
  { timestamp: 1724217600000, open: 111, high: 117, low: 107, close: 113, volume: 1300 },
];

export default function FibToolsChart() {
  const chart = useRef<KLineChart | null>(null);

  useEffect(() => {
    const c = init("fibchart", { styles: { candle: { type: "candle_solid" } } });
    chart.current = c;
    c.applyNewData(sampleData);

    return () => {
      dispose("fibchart");
      chart.current = null;
    };
  }, []);

  const create = () => {
    chart.current?.createOverlay({
      name: "fibonacciLine", // Built-in Fib Retracement tool
      needDefaultPointFigure: true,
    });
  };

  return (
    <div style={{ width: "100%", height: "100vh", position: "relative" }}>
      <div style={{ marginBottom: 8 }}>
        <button onClick={create}>📏 Fib Retracement</button>
      </div>
      <div id="fibchart" style={{ width: "100%", height: "90%" }} />
    </div>
  );
}
