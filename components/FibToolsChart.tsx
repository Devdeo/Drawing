"use client";
import { useEffect, useRef } from "react";
import {
  init,
  dispose,
  registerOverlay,
  getSupportedOverlays,
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

// --- Register custom overlays once (global) ---
let overlaysRegistered = false;
function registerCustomOverlays() {
  if (overlaysRegistered) return;

  // Fib Circles (full circles at fib radii)
  registerOverlay({
    name: "fibCircles",
    totalStep: 2,
    createPointFigures: ({ coordinates }) => {
      if (!coordinates || coordinates.length < 2) return [];
      const [p1, p2] = coordinates;
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const r = Math.sqrt(dx * dx + dy * dy);
      const levels = [0.236, 0.382, 0.5, 0.618, 1];
      return levels.map((lv) => ({
        type: "arc",
        attrs: { x: p1.x, y: p1.y, r: r * lv, startAngle: 0, endAngle: Math.PI * 2 },
      }));
    },
  });

  // Fib Spiral (simple poly-line approximation)
  registerOverlay({
    name: "fibSpiral",
    totalStep: 2,
    createPointFigures: ({ coordinates }) => {
      if (!coordinates || coordinates.length < 2) return [];
      const [p1, p2] = coordinates;
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const r = Math.sqrt(dx * dx + dy * dy);
      const steps = 64;
      const pts = [] as Array<{ x: number; y: number }>;
      for (let i = 0; i <= steps; i++) {
        const theta = i * (Math.PI / 16);
        const radius = r * Math.pow(1.618, i / 12);
        pts.push({ x: p1.x + radius * Math.cos(theta), y: p1.y + radius * Math.sin(theta) });
      }
      return [
        {
          type: "line",
          attrs: { coordinates: pts }, // line supports multi-point polylines per docs
        },
      ];
    },
  });

  // Fib Arcs (half arcs at fib radii)
  registerOverlay({
    name: "fibArcs",
    totalStep: 2,
    createPointFigures: ({ coordinates }) => {
      if (!coordinates || coordinates.length < 2) return [];
      const [p1, p2] = coordinates;
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const r = Math.sqrt(dx * dx + dy * dy);
      const levels = [0.382, 0.5, 0.618, 1];
      return levels.map((lv) => ({
        type: "arc",
        attrs: { x: p1.x, y: p1.y, r: r * lv, startAngle: 0, endAngle: Math.PI },
      }));
    },
  });

  // Fib Wedge (two rays from p1 to right edge)
  registerOverlay({
    name: "fibWedge",
    totalStep: 3,
    createPointFigures: ({ coordinates, bounding }) => {
      if (!coordinates || coordinates.length < 3 || !bounding) return [];
      const [p1, p2, p3] = coordinates;
      const { left, width } = bounding;
      const x2 = left + width;
      return [
        { type: "line", attrs: { coordinates: [p1, { x: x2, y: p2.y }] } },
        { type: "line", attrs: { coordinates: [p1, { x: x2, y: p3.y }] } },
      ];
    },
  });

  // Fib Fan (speed resistance fan with fib ratios)
  registerOverlay({
    name: "fibFanCustom",
    totalStep: 2,
    createPointFigures: ({ coordinates }) => {
      if (!coordinates || coordinates.length < 2) return [];
      const [p1, p2] = coordinates;
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const ratios = [0.382, 0.5, 0.618, 1];
      return ratios.map((r) => ({
        type: "line",
        attrs: { coordinates: [p1, { x: p1.x + dx, y: p1.y + dy * r }] },
      }));
    },
  });

  // Trend-based Fib Extension (horizontal levels past p2)
  registerOverlay({
    name: "fibExtensionCustom",
    totalStep: 2,
    createPointFigures: ({ coordinates, bounding }) => {
      if (!coordinates || coordinates.length < 2 || !bounding) return [];
      const [p1, p2] = coordinates;
      const dy = p2.y - p1.y;
      const { left, width } = bounding;
      const xEnd = left + width;
      const levels = [1.272, 1.618, 2.0];
      return levels.map((lv) => ({
        type: "line",
        attrs: { coordinates: [
          { x: p2.x, y: p1.y + dy * lv },
          { x: xEnd, y: p1.y + dy * lv },
        ] },
      }));
    },
  });

  // Fib Time Zones (vertical lines at fib-number spacings)
  registerOverlay({
    name: "fibTimeZoneCustom",
    totalStep: 2,
    createPointFigures: ({ coordinates, bounding }) => {
      if (!coordinates || coordinates.length < 2 || !bounding) return [];
      const [p1, p2] = coordinates;
      const dx = p2.x - p1.x;
      const fibs = [1, 2, 3, 5, 8, 13];
      return fibs.map((n) => {
        const x = p1.x + dx * n;
        return {
          type: "line",
          attrs: { coordinates: [
            { x, y: bounding.top },
            { x, y: bounding.top + bounding.height },
          ] },
        };
      });
    },
  });

  overlaysRegistered = true;
}

export default function FibToolsChart() {
  const chart = useRef<KLineChart | null>(null);

  useEffect(() => {
    // Make sure overlays are registered before using them
    registerCustomOverlays();

    const c = init("fibchart", { styles: { candle: { type: "candle_solid" } } });
    chart.current = c;
    c.applyNewData(sampleData);

    return () => {
      dispose("fibchart");
      chart.current = null;
    };
  }, []);

  const create = (name: string) => {
    // Guard against non-existent built-ins; prefer our custom ones
    const supported = (getSupportedOverlays?.() ?? []) as string[];
    if (!supported.includes(name)) {
      // Map UI names to custom overlays when the built-in is not available
      const fallbackMap: Record<string, string> = {
        fibonacciExtension: "fibExtensionCustom",
        fibonacciChannel: "fibChannelCustom", // we expose as button below directly
        fibonacciTimeLine: "fibTimeZoneCustom",
        fibonacciFanLine: "fibFanCustom",
      };
      name = fallbackMap[name] ?? name;
    }

    chart.current?.createOverlay({
      name,
      needDefaultPointFigure: true,
      styles: {
        line: { style: "solid", size: 2 },
        arc: { style: "stroke", size: 2 },
      },
    });
  };

  return (
    <div style={{ width: "100%", height: "100vh", position: "relative" }}>
      <div style={{ marginBottom: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
        {/* Built-in (exists on OSS). If it doesn't, nothing breaks. */}
        <button onClick={() => create("fibonacciLine")}>
          📏 Fib Retracement
        </button>
        {/* Custom fib tools */}
        <button onClick={() => create("fibExtensionCustom")}>
          ➕ Trend-Based Fib Extension
        </button>
        <button onClick={() => create("fibChannelCustom")}>
          📊 Fib Channel
        </button>
        <button onClick={() => create("fibTimeZoneCustom")}>
          ⏳ Fib Time Zone
        </button>
        <button onClick={() => create("fibFanCustom")}>
          🌀 Fib Speed Resistance Fan
        </button>

        <button onClick={() => create("fibCircles")}>⭕ Fib Circles</button>
        <button onClick={() => create("fibSpiral")}>🌀 Fib Spiral</button>
        <button onClick={() => create("fibArcs")}>◔ Fib Arcs</button>
        <button onClick={() => create("fibWedge")}>△ Fib Wedge</button>
      </div>
      <div id="fibchart" style={{ width: "100%", height: "90%" }} />
    </div>
  );
}
