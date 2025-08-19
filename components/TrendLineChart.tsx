"use client";
import { useEffect, useRef, useState } from "react";
import {
  init,
  dispose,
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

export default function TrendLineChart() {
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

      // ❌ Ignore trendlines (segment)
      if (overlay.name === "segment") {
        setSelectedOverlay(null);
        setShowSettings(false);
        setSettingsPos(null);
        return;
      }

      // ✅ Non-trendline overlays only
      setSelectedOverlay(overlay);

      const pts = overlay.points ?? [];
      const lastPt = pts[pts.length - 1];
      if (lastPt) {
        const pos = chart.current.convertToPixel(lastPt) as { x: number; y: number };
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

  const drawTrendline = () => {
    chart.current?.createOverlay({
      name: "segment",
      needDefaultPointFigure: true,
      styles: { line: { style: "solid", color, size: lineWidth } },
    });
  };

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
      <div style={{ marginBottom: 8 }}>
        <button type="button" onClick={drawTrendline}>➕ Draw Trendline</button>
      </div>
      <div id="chart" style={{ width: "100%", height: "90%" }} />

      {/* ⚙️ Gear Icon → never for trendlines */}
      {selectedOverlay && selectedOverlay.name !== "segment" && settingsPos && !showSettings && (
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
            cursor: "pointer",
          }}
          onClick={() => setShowSettings(true)}
        >
          ⚙️
        </button>
      )}

      {/* Settings Panel (non-trendlines only) */}
      {selectedOverlay && selectedOverlay.name !== "segment" && showSettings && (
        <div
          style={{
            position: "absolute",
            top: settingsPos ? settingsPos.y : 50,
            left: settingsPos ? settingsPos.x + 40 : 20,
            padding: "10px",
            background: "white",
            border: "1px solid #ccc",
            borderRadius: "4px",
            zIndex: 999,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong>Overlay Settings</strong>
            <button
              type="button"
              onClick={() => setShowSettings(false)}
              style={{ background: "transparent", border: "none", cursor: "pointer" }}
            >
              ✖
            </button>
          </div>
          <div>
            <label>Color: </label>
            <input
              type="color"
              value={color}
              onChange={(e) => {
                const v = e.target.value;
                setColor(v);
                updateOverlayStyle({ color: v });
              }}
            />
          </div>
          <div>
            <label>Thickness: </label>
            <input
              type="number"
              value={lineWidth}
              min={1}
              max={10}
              onChange={(e) => {
                const size = Number(e.target.value);
                setLineWidth(size);
                updateOverlayStyle({ size });
              }}
            />
          </div>
          <button
            type="button"
            style={{ marginTop: 5, background: "#eee", cursor: "pointer" }}
            onClick={removeOverlay}
          >
            ❌ Remove Overlay
          </button>
        </div>
      )}
    </div>
  );
}
