"use client";
import { useEffect, useRef } from "react";
import {
  init,
  dispose,
  registerOverlay,
  type KLineChart,
  type KLineData,
} from "klinecharts";

const sampleData: KLineData[] = [
  { timestamp: 1723872000000, open: 100, high: 110, low: 95, close: 105, volume: 1200 },
  { timestamp: 1723958400000, open: 105, high: 115, low: 100, close: 112, volume: 900 },
  { timestamp: 1724044800000, open: 112, high: 118, low: 108, close: 115, volume: 1500 },
  { timestamp: 1724131200000, open: 115, high: 120, low: 110, close: 111, volume: 700 },
  { timestamp: 1724217600000, open: 111, high: 117, low: 107, close: 113, volume: 1300 },
];

// --- helpers ---------------------------------------------------------------
const drawSequentialLine = (coordinates: any[], color: string, size = 2) => {
  if (!coordinates || coordinates.length < 2) return [] as any[];
  return [
    {
      type: "line",
      attrs: { coordinates }, // polyline across all current points
      styles: { color, size, style: "solid" },
    },
  ];
};

const drawFillIfClosed = (coordinates: any[], color: string) => {
  if (!coordinates || coordinates.length < 3) return [] as any[];
  return [
    {
      type: "polygon",
      attrs: { coordinates },
      styles: { style: "stroke_fill", color: `${color}33`, borderColor: color, borderSize: 1 },
    },
  ];
};

export default function PatternToolsChart() {
  const chart = useRef<KLineChart | null>(null);

  useEffect(() => {
    // 1) register overlays BEFORE usage, and render progressively while drawing
    const registerPattern = (
      name: string,
      labels: string[],
      opts: { color: string; closeShape?: boolean }
    ) => {
      registerOverlay({
        name,
        totalStep: labels.length,
        // Show anchor points AND our custom lines while drawing
        needDefaultPointFigure: true,
        createPointFigures: ({ coordinates }) => {
          const figs: any[] = [];
          const n = coordinates.length;

          // progressive line preview
          figs.push(...drawSequentialLine(coordinates, opts.color));

          // optional fill (only when we already have 3+ points)
          if (opts.closeShape) {
            figs.push(...drawFillIfClosed(coordinates, opts.color));
          }

          // labels for points collected so far
          for (let i = 0; i < n && i < labels.length; i++) {
            figs.push({
              type: "text",
              attrs: { x: coordinates[i].x, y: coordinates[i].y, text: labels[i] },
              styles: { color: opts.color, size: 12 },
            });
          }

          return figs;
        },
      });
    };

    // Generic patterns (progressive drawing)
    registerPattern("xabcdPattern", ["X", "A", "B", "C", "D"], { color: "#e11d48", closeShape: true });
    registerPattern("cypherPattern", ["X", "A", "B", "C", "D"], { color: "#f97316", closeShape: true });
    registerPattern("abcdPattern", ["A", "B", "C", "D"], { color: "#2563eb", closeShape: true });
    registerPattern("trianglePattern", ["A", "B", "C"], { color: "#16a34a", closeShape: true });
    registerPattern("threeDrives", ["1", "2", "3", "4"], { color: "#9333ea", closeShape: false });
    registerPattern("elliottWave", ["1", "2", "3", "4", "5"], { color: "#0ea5e9", closeShape: false });
    registerPattern("elliottImpulse", ["1", "2", "3", "4", "5"], { color: "#f43f5e", closeShape: false });
    registerPattern("elliottCorrection", ["A", "B", "C"], { color: "#0891b2", closeShape: false });

    // Head & Shoulders (progressive neckline + shoulders)
    registerOverlay({
      name: "headShoulders",
      totalStep: 5, // LS, H, RS, NL1, NL2
      needDefaultPointFigure: true,
      createPointFigures: ({ coordinates }) => {
        const figs: any[] = [];
        const n = coordinates.length;
        const color = "#854d0e";

        // shoulders & head (first 3 points)
        if (n >= 2) {
          figs.push({ type: "line", attrs: { coordinates: coordinates.slice(0, Math.min(n, 3)) }, styles: { color, size: 2 } });
        }
        // neckline when we have point 4 and/or 5
        if (n >= 4) {
          const nlEnd = n >= 5 ? coordinates[4] : coordinates[3];
          figs.push({ type: "line", attrs: { coordinates: [coordinates[3], nlEnd] }, styles: { color, size: 2 } });
        }
        // labels for available points
        const labels = ["LS", "H", "RS", "NL1", "NL2"];
        for (let i = 0; i < n; i++) {
          figs.push({ type: "text", attrs: { x: coordinates[i].x, y: coordinates[i].y, text: labels[i] }, styles: { color } });
        }
        return figs;
      },
    });

    // 2) initialize chart AFTER overlays are registered
    const c = init("patternchart", { styles: { candle: { type: "candle_solid" } } });
    chart.current = c;
    c.applyNewData(sampleData);

    return () => {
      dispose("patternchart");
      chart.current = null;
    };
  }, []);

  const create = (name: string) => {
    chart.current?.createOverlay({ name });
  };

  return (
    <div style={{ width: "100%", height: "100vh", position: "relative" }}>
      <div style={{ marginBottom: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button onClick={() => create("xabcdPattern")}>❌ XABCD</button>
        <button onClick={() => create("cypherPattern")}>🔀 Cypher</button>
        <button onClick={() => create("headShoulders")}>👤 Head & Shoulders</button>
        <button onClick={() => create("abcdPattern")}>🔺 ABCD</button>
        <button onClick={() => create("trianglePattern")}>🔻 Triangle</button>
        <button onClick={() => create("threeDrives")}>➂ Three Drives</button>
        <button onClick={() => create("elliottWave")}>📈 Elliott Waves</button>
        <button onClick={() => create("elliottImpulse")}>⚡ Elliott Impulse</button>
        <button onClick={() => create("elliottCorrection")}>↔ Elliott Correction</button>
      </div>
      {/* NOTE: no stray comma in width string */}
      <div id="patternchart" style={{ width: "100%", height: "90%" }} />
    </div>
  );
}
