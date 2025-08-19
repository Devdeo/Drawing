"use client";
import { useEffect, useRef, useState } from "react";
import {
  init,
  dispose,
  registerOverlay,
  type KLineChart,
  type KLineData,
  type Overlay,
} from "klinecharts";

const sampleData: KLineData[] = [
  { timestamp: 1723872000000, open: 100, high: 110, low: 95, close: 105, volume: 1200 },
  { timestamp: 1723958400000, open: 105, high: 115, low: 100, close: 112, volume: 900 },
  { timestamp: 1724044800000, open: 112, high: 118, low: 108, close: 115, volume: 1500 },
  { timestamp: 1724131200000, open: 115, high: 120, low: 110, close: 111, volume: 700 },
  { timestamp: 1724217600000, open: 111, high: 117, low: 107, close: 113, volume: 1300 },
];

// ---- Custom overlays ---- //
// 1) Trend Angle (2 clicks)
registerOverlay({
  name: "trendAngle",
  totalStep: 2,
  needDefaultPointFigure: false,
  createPointFigures: ({ coordinates }) => {
    if (!coordinates || coordinates.length < 2) return [];
    const [p1, p2] = coordinates;
    const angle = (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180) / Math.PI;
    return [
      { type: "line", attrs: { coordinates: [p1, p2] } },
      { type: "text", attrs: { x: p2.x, y: p2.y, text: `${angle.toFixed(1)}°` } },
    ];
  },
});

// 2) Cross Line (1 click)
registerOverlay({
  name: "crossLine",
  totalStep: 1,
  needDefaultPointFigure: false,
  createPointFigures: ({ coordinates, bounding }) => {
    if (!coordinates || !coordinates[0] || !bounding) return [];
    const p = coordinates[0];
    return [
      { type: "line", attrs: { coordinates: [{ x: bounding.left, y: p.y }, { x: bounding.left + bounding.width, y: p.y }] } },
      { type: "line", attrs: { coordinates: [{ x: p.x, y: bounding.top }, { x: p.x, y: bounding.top + bounding.height }] } },
    ];
  },
});

// 3) Flat Top/Bottom (2 clicks)
registerOverlay({
  name: "flatTopBottom",
  totalStep: 2,
  needDefaultPointFigure: false,
  createPointFigures: ({ coordinates, bounding }) => {
    if (!coordinates || coordinates.length < 2 || !bounding) return [];
    const [p1, p2] = coordinates;
    return [
      { type: "line", attrs: { coordinates: [{ x: bounding.left, y: p1.y }, { x: bounding.left + bounding.width, y: p1.y }] } },
      { type: "line", attrs: { coordinates: [{ x: bounding.left, y: p2.y }, { x: bounding.left + bounding.width, y: p2.y }] } },
    ];
  },
});

// 4) Regression Trend (auto least squares)
registerOverlay({
  name: "regressionTrend",
  totalStep: 2,
  needDefaultPointFigure: false,
  createPointFigures: ({ coordinates, data, xAxis, yAxis }) => {
    if (!coordinates || coordinates.length < 2 || !data || !xAxis || !yAxis) return [];
    const [p1, p2] = coordinates;
    const fromIndex = Math.min(p1.dataIndex, p2.dataIndex);
    const toIndex = Math.max(p1.dataIndex, p2.dataIndex);
    const slice = data.slice(fromIndex, toIndex + 1);
    if (slice.length < 2) return [];

    const xs = slice.map((d, i) => i);
    const ys = slice.map((d) => d.close);
    const n = xs.length;
    const sumX = xs.reduce((a, b) => a + b, 0);
    const sumY = ys.reduce((a, b) => a + b, 0);
    const sumXY = xs.reduce((a, b, i) => a + b * ys[i], 0);
    const sumX2 = xs.reduce((a, b) => a + b * b, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const yStart = intercept;
    const yEnd = slope * (n - 1) + intercept;

    return [
      {
        type: "line",
        attrs: {
          coordinates: [
            { x: xAxis.convertToPixel(fromIndex), y: yAxis.convertToPixel(yStart) },
            { x: xAxis.convertToPixel(toIndex), y: yAxis.convertToPixel(yEnd) },
          ],
        },
      },
    ];
  },
});

export default function TrendLineChart_Fixed() {
  const chart = useRef<KLineChart | null>(null);

  const [selectedOverlay, setSelectedOverlay] = useState<Overlay | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsPos, setSettingsPos] = useState<{ x: number; y: number } | null>(null);
  const [color, setColor] = useState("#ff0000");
  const [lineWidth, setLineWidth] = useState(2);

  useEffect(() => {
    const c = init("chart", { styles: { candle: { type: "candle_solid" } } });
    chart.current = c;
    c.applyNewData(sampleData);

    const handler = (action: any) => {
      if (!chart.current) return;
      const overlay = action?.overlay as Overlay | undefined;
      if (!overlay) {
        setSelectedOverlay(null);
        setShowSettings(false);
        setSettingsPos(null);
        return;
      }
      if (overlay.name === "segment" || overlay.name === "rayLine") {
        setSelectedOverlay(null);
        setShowSettings(false);
        setSettingsPos(null);
        return;
      }
      setSelectedOverlay(overlay);
      const pts = overlay.points ?? [];
      const lastPt = pts[pts.length - 1];
      if (lastPt) {
        const pos = (chart.current as any).convertToPixel(lastPt) as { x: number; y: number };
        setSettingsPos({ x: pos.x, y: pos.y });
      }
      const line = (overlay.styles as any)?.line;
      setColor(line?.color ?? "#ff0000");
      setLineWidth(line?.size ?? 2);
    };

    c.subscribeAction("overlay:selected", handler);
    c.subscribeAction("overlay:drawEnd", handler);
    return () => {
      dispose("chart");
      chart.current = null;
    };
  }, []);

  const create = (name: string) => {
    chart.current?.createOverlay({
      name,
      styles: { line: { style: "solid", color, size: lineWidth } },
    });
  };

  const drawTrendline = () => create("segment");
  const drawRay = () => create("rayLine");
  const drawInfoLine = () => create("priceLine");
  const drawExtendedLine = () => create("straightLine");
  const drawHorizontalLine = () => create("horizontalStraightLine");
  const drawHorizontalRay = () => create("horizontalRayLine");
  const drawVerticalLine = () => create("verticalStraightLine");
  const drawParallelChannel = () => create("parallelStraightLine");
  const drawPriceChannel = () => create("priceChannelLine");
  const drawTrendAngle = () => create("trendAngle");
  const drawCrossLine = () => create("crossLine");
  const drawRegressionTrend = () => create("regressionTrend");
  const drawFlatTopBottom = () => create("flatTopBottom");

  const updateOverlayStyle = (updates: { color?: string; size?: number }) => {
    if (!chart.current || !selectedOverlay) return;
    chart.current.overrideOverlay({
      id: selectedOverlay.id,
      styles: {
        line: {
          style: "solid",
          color: updates.color ?? color,
          size: updates.size ?? lineWidth,
        },
      },
    });
  };

  const removeOverlay = () => {
    if (!chart.current || !selectedOverlay) return;
    chart.current.removeOverlay(selectedOverlay.id);
    setSelectedOverlay(null);
    setShowSettings(false);
    setSettingsPos(null);
  };

  return (
    <div style={{ width: "100%", height: "100vh", position: "relative" }}>
      <div style={{ marginBottom: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button onClick={drawTrendline}>➕ Trendline</button>
        <button onClick={drawRay}>➕ Ray</button>
        <button onClick={drawInfoLine}>ℹ️ Info line</button>
        <button onClick={drawExtendedLine}>↔️ Extended line</button>
        <button onClick={drawHorizontalLine}>— Horizontal line</button>
        <button onClick={drawHorizontalRay}>⟶ Horizontal ray</button>
        <button onClick={drawVerticalLine}>｜Vertical line</button>
        <button onClick={drawParallelChannel}>∥ Parallel channel</button>
        <button onClick={drawPriceChannel}>≋ Price channel</button>
        <button onClick={drawTrendAngle}>📐 Trend angle</button>
        <button onClick={drawCrossLine}>✚ Cross line</button>
        <button onClick={drawRegressionTrend}>📈 Regression trend</button>
        <button onClick={drawFlatTopBottom}>▭ Flat Top/Bottom</button>
      </div>
      <div id="chart" style={{ width: "100%", height: "90%" }} />

      {selectedOverlay && !["segment", "rayLine"].includes(selectedOverlay.name) && settingsPos && !showSettings && (
        <button
          style={{
            position: "absolute",
            top: settingsPos.y - 20,
            left: settingsPos.x + 10,
            background: "white",
            border: "1px solid #ccc",
            borderRadius: "50%",
            width: 28,
            height: 28,
          }}
          onClick={() => setShowSettings(true)}
        >
          ⚙️
        </button>
      )}

      {selectedOverlay && !["segment", "rayLine"].includes(selectedOverlay.name) && showSettings && (
        <div
          style={{
            position: "absolute",
            top: settingsPos ? settingsPos.y : 50,
            left: settingsPos ? settingsPos.x + 40 : 20,
            padding: 10,
            background: "white",
            border: "1px solid #ccc",
          }}
        >
          <strong>Overlay Settings</strong>
          <div>
            <label>Color: </label>
            <input type="color" value={color} onChange={(e) => { setColor(e.target.value); updateOverlayStyle({ color: e.target.value }); }} />
          </div>
          <div>
            <label>Thickness: </label>
            <input type="number" value={lineWidth} min={1} max={10} onChange={(e) => { const v = Number(e.target.value); setLineWidth(v); updateOverlayStyle({ size: v }); }} />
          </div>
          <button onClick={removeOverlay}>❌ Remove Overlay</button>
        </div>
      )}
    </div>
  );
}
