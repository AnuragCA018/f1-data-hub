"use client";

import { useEffect, useRef, useState } from "react";

interface DriverTrackData {
  code: string;
  x: (number | null)[];
  y: (number | null)[];
  speed: (number | null)[];
  color: string;
}

interface Props {
  driver1: DriverTrackData;
  driver2: DriverTrackData;
}

function projectToCanvas(
  xs: (number | null)[],
  ys: (number | null)[],
  speeds: (number | null)[],
  canvasW: number,
  canvasH: number,
  padding = 40
): Array<{ x: number; y: number; speed?: number | null }> {
  const valid: Array<{ x: number; y: number; speed: number | null }> = [];
  for (let i = 0; i < xs.length; i++) {
    if (xs[i] != null && ys[i] != null) {
      valid.push({ x: xs[i]!, y: ys[i]!, speed: speeds[i] ?? null });
    }
  }
  if (!valid.length) return [];

  const allX = valid.map((p) => p.x);
  const allY = valid.map((p) => p.y);
  const minX = Math.min(...allX), maxX = Math.max(...allX);
  const minY = Math.min(...allY), maxY = Math.max(...allY);
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const drawW = canvasW - padding * 2;
  const drawH = canvasH - padding * 2;

  // Maintain aspect ratio
  const scale = Math.min(drawW / rangeX, drawH / rangeY);
  const offsetX = padding + (drawW - rangeX * scale) / 2;
  const offsetY = padding + (drawH - rangeY * scale) / 2;

  return valid.map((p) => ({
    x: offsetX + (p.x - minX) * scale,
    y: offsetY + (maxY - p.y) * scale, // flip Y axis
    speed: p.speed,
  }));
}

function drawTrack(
  ctx: CanvasRenderingContext2D,
  pts: Array<{ x: number; y: number; speed?: number | null }>,
  color: string,
  lineWidth = 2,
  colorBySpeed = false
) {
  if (pts.length < 2) return;

  if (colorBySpeed) {
    const speeds = pts.map((p) => p.speed ?? 0);
    const maxSpd = Math.max(...speeds, 1);
    for (let i = 1; i < pts.length; i++) {
      const ratio = (pts[i].speed ?? 0) / maxSpd;
      // interpolate: slow=red, fast=green
      const r = Math.round(255 * (1 - ratio));
      const g = Math.round(200 * ratio);
      ctx.beginPath();
      ctx.moveTo(pts[i - 1].x, pts[i - 1].y);
      ctx.lineTo(pts[i].x, pts[i].y);
      ctx.strokeStyle = `rgb(${r},${g},50)`;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }
    return;
  }

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i].x, pts[i].y);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = "round";
  ctx.stroke();
}

export default function TrackMap({ driver1, driver2 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [colorBySpeed, setColorBySpeed] = useState(false);
  const [animFrame, setAnimFrame] = useState(0);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width  = canvas.offsetWidth  || 800;
    const H = canvas.height = canvas.offsetHeight || 480;

    // Dark canvas background
    ctx.fillStyle = "#0B0D12";
    ctx.fillRect(0, 0, W, H);

    // Subtle grid
    ctx.strokeStyle = "#1E253520";
    ctx.lineWidth = 0.5;
    const gridSize = 60;
    for (let x = 0; x < W; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    const pts1 = projectToCanvas(driver1.x, driver1.y, driver1.speed, W, H);
    const pts2 = projectToCanvas(driver2.x, driver2.y, driver2.speed, W, H);

    console.log("[TrackMap] canvas pts1:", pts1.length, "pts2:", pts2.length);

    // Thick white ghost outline
    ctx.globalAlpha = 0.08;
    drawTrack(ctx, pts1, "#ffffff", 10);
    ctx.globalAlpha = 1;

    // Draw driver lines
    if (colorBySpeed) {
      drawTrack(ctx, pts1, driver1.color, 2.5, true);
      drawTrack(ctx, pts2, driver2.color, 2.5, true);
    } else {
      drawTrack(ctx, pts1, driver1.color, 2.5);
      drawTrack(ctx, pts2, driver2.color, 2);
    }

    // Animated position dots with halo
    const idx1 = Math.min(animFrame, pts1.length - 1);
    const idx2 = Math.min(animFrame, pts2.length - 1);

    if (pts1[idx1]) {
      // Outer halo
      ctx.beginPath();
      ctx.arc(pts1[idx1].x, pts1[idx1].y, 10, 0, Math.PI * 2);
      ctx.fillStyle = driver1.color + "30";
      ctx.fill();
      // Dot
      ctx.beginPath();
      ctx.arc(pts1[idx1].x, pts1[idx1].y, 5, 0, Math.PI * 2);
      ctx.fillStyle = driver1.color;
      ctx.fill();
      ctx.strokeStyle = "#0B0D12";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // Label
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 10px 'JetBrains Mono', monospace";
      ctx.fillText(driver1.code, pts1[idx1].x + 8, pts1[idx1].y + 4);
    }
    if (pts2[idx2]) {
      ctx.beginPath();
      ctx.arc(pts2[idx2].x, pts2[idx2].y, 10, 0, Math.PI * 2);
      ctx.fillStyle = driver2.color + "30";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(pts2[idx2].x, pts2[idx2].y, 5, 0, Math.PI * 2);
      ctx.fillStyle = driver2.color;
      ctx.fill();
      ctx.strokeStyle = "#0B0D12";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 10px 'JetBrains Mono', monospace";
      ctx.fillText(driver2.code, pts2[idx2].x + 8, pts2[idx2].y + 4);
    }
  }, [driver1, driver2, colorBySpeed, animFrame]);

  function startAnimation() {
    cancelAnimationFrame(animRef.current);
    const maxLen = Math.max(driver1.x.length, driver2.x.length);
    let frame = 0;
    const SKIP = Math.max(1, Math.floor(maxLen / 200)); // ~200 animation frames

    function tick() {
      setAnimFrame(frame * SKIP);
      frame++;
      if (frame * SKIP < maxLen) {
        animRef.current = requestAnimationFrame(tick);
      }
    }
    tick();
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-3 flex-wrap">
        <button onClick={startAnimation} className="btn-primary text-sm py-1.5 px-4">
          ▶ Animate Lap
        </button>
        <button
          onClick={() => setColorBySpeed((v) => !v)}
          className={`btn-secondary text-sm py-1.5 px-4 ${colorBySpeed ? "ring-1 ring-[#FF1801]/40" : ""}`}
        >
          ◈ Speed Heatmap {colorBySpeed ? "ON" : "OFF"}
        </button>
      </div>
      <canvas
        ref={canvasRef}
        className="w-full rounded-xl"
        style={{
          height: "480px",
          cursor: "crosshair",
          background: "#0B0D12",
          border: "1px solid #1E2535",
        }}
      />
    </div>
  );
}
