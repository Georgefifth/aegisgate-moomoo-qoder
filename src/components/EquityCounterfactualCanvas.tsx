import React, { useEffect, useRef, useState } from "react";
import { EquityCurvePoint } from "../engine/marketDataset";

interface Props {
  points: EquityCurvePoint[];
}

export const EquityCounterfactualCanvas: React.FC<Props> = ({ points }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number>(points.length - 1);

  useEffect(() => {
    setHoverIdx(points.length - 1);
  }, [points.length]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || points.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(300, rect.width || 460);
    const height = 250;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Background: Stark carbon oscilloscope (#0C0C0C)
    ctx.fillStyle = "#0C0C0C";
    ctx.fillRect(0, 0, width, height);

    const padLeft = 58;
    const padRight = 18;
    const padTop = 24;
    const padBottom = 34;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    const allVals = points.flatMap((p) => [
      p.guardedEquityUsd,
      p.ungatedCounterfactualUsd,
      p.qqqBenchmarkUsd,
    ]);
    const minVal = Math.min(...allVals, 90000) - 1000;
    const maxVal = Math.max(...allVals, 106000) + 1000;

    const xFor = (i: number) =>
      padLeft + (i / Math.max(1, points.length - 1)) * plotW;
    const yFor = (v: number) =>
      padTop + ((maxVal - v) / Math.max(1, maxVal - minVal)) * plotH;

    // Grid lines
    ctx.strokeStyle = "rgba(242, 239, 233, 0.14)";
    ctx.lineWidth = 1;
    const steps = 4;
    ctx.font = "600 10px 'IBM Plex Mono', monospace";
    ctx.fillStyle = "rgba(242, 239, 233, 0.65)";
    for (let s = 0; s <= steps; s++) {
      const val = minVal + ((maxVal - minVal) * s) / steps;
      const y = yFor(val);
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(width - padRight, y);
      ctx.stroke();
      ctx.fillText(`$${(val / 1000).toFixed(1)}k`, 8, y + 3);
    }

    // $100k Baseline Rule
    const y100k = yFor(100000);
    ctx.strokeStyle = "rgba(242, 239, 233, 0.35)";
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(padLeft, y100k);
    ctx.lineTo(width - padRight, y100k);
    ctx.stroke();
    ctx.setLineDash([]);

    // Shaded Saved-Drawdown Spread between Guarded Equity and Ungated Counterfactual
    ctx.fillStyle = "rgba(0, 230, 118, 0.13)";
    ctx.beginPath();
    points.forEach((p, i) => {
      const x = xFor(i);
      const y = yFor(p.guardedEquityUsd);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    for (let i = points.length - 1; i >= 0; i--) {
      ctx.lineTo(xFor(i), yFor(points[i].ungatedCounterfactualUsd));
    }
    ctx.closePath();
    ctx.fill();

    // 1. QQQ Benchmark Line (Muted Slate)
    ctx.strokeStyle = "#8C877E";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    points.forEach((p, i) => {
      const x = xFor(i);
      const y = yFor(p.qqqBenchmarkUsd);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // 2. Ungated Counterfactual Equity (Signal Orange Dashed #FF3300)
    ctx.strokeStyle = "#FF3300";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    points.forEach((p, i) => {
      const x = xFor(i);
      const y = yFor(p.ungatedCounterfactualUsd);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.setLineDash([]);

    // 3. Actual Guarded Equity (Neon Swiss Emerald #00E676)
    ctx.strokeStyle = "#00E676";
    ctx.lineWidth = 2.75;
    ctx.beginPath();
    points.forEach((p, i) => {
      const x = xFor(i);
      const y = yFor(p.guardedEquityUsd);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Data nodes & X-axis labels
    points.forEach((p, i) => {
      const x = xFor(i);
      const yG = yFor(p.guardedEquityUsd);
      const yU = yFor(p.ungatedCounterfactualUsd);

      ctx.fillStyle = "#00E676";
      ctx.fillRect(x - 3, yG - 3, 6, 6);

      ctx.fillStyle = "#FF3300";
      ctx.fillRect(x - 2.5, yU - 2.5, 5, 5);

      ctx.fillStyle = "rgba(242, 239, 233, 0.75)";
      ctx.font = "600 10px 'IBM Plex Mono', monospace";
      const shortDay = p.dayLabel.split(" // ")[0];
      ctx.fillText(shortDay, x - 8, height - 10);
    });

    // Active Hover Crosshair
    const activeIdx = Math.min(points.length - 1, Math.max(0, hoverIdx));
    const hx = xFor(activeIdx);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(hx, padTop);
    ctx.lineTo(hx, height - padBottom);
    ctx.stroke();
  }, [points, hoverIdx]);

  const activePoint =
    points[Math.min(points.length - 1, Math.max(0, hoverIdx))] || points[0];

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = e.clientX - rect.left - 58;
    const plotW = Math.max(1, rect.width - 76);
    const ratio = Math.min(1, Math.max(0, relX / plotW));
    const idx = Math.round(ratio * (points.length - 1));
    setHoverIdx(idx);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div
        style={{
          border: "2px solid #0C0C0C",
          background: "#0C0C0C",
          padding: "10px 12px 6px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            gap: "8px",
            color: "#F2EFE9",
            fontSize: "11px",
            marginBottom: "6px",
          }}
        >
          <span>
            <strong style={{ color: "#00E676" }}>■ GUARDED NAV:</strong> $
            {activePoint.guardedEquityUsd.toLocaleString()}
          </span>
          <span>
            <strong style={{ color: "#FF3300" }}>--- UNGATED:</strong> $
            {activePoint.ungatedCounterfactualUsd.toLocaleString()}
          </span>
          <span>
            <strong style={{ color: "#00E676" }}>SAVED DD:</strong> +$
            {activePoint.savedDrawdownCumulativeUsd.toLocaleString()}
          </span>
        </div>
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          style={{
            width: "100%",
            height: "250px",
            display: "block",
            cursor: "crosshair",
          }}
          aria-label="Guarded Portfolio Equity versus Ungated Counterfactual Equity Canvas"
        />
        <div
          style={{
            color: "#BDB7AD",
            fontSize: "11px",
            paddingTop: "6px",
            borderTop: "1px solid rgba(242,239,233,0.15)",
            display: "flex",
            justifyContent: "space-between",
            gap: "8px",
          }}
        >
          <span>
            <strong>{activePoint.dayLabel}</strong> ({activePoint.dateStr})
          </span>
          <span>{activePoint.sessionNote}</span>
        </div>
      </div>
    </div>
  );
};
