"use client";

import { useEffect, useRef } from "react";
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
  type ChartConfiguration,
} from "chart.js";
import type { TelemetryPoint } from "@/types";

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler);

interface DriverData {
  code: string;
  points: TelemetryPoint[];
  color: string;
}

interface Props {
  driver1: DriverData;
  driver2: DriverData;
}

function downsample(points: TelemetryPoint[], target = 400): TelemetryPoint[] {
  if (points.length <= target) return points;
  const factor = Math.ceil(points.length / target);
  return points.filter((_, i) => i % factor === 0);
}

// Create a canvas gradient fill
function makeGradient(ctx: CanvasRenderingContext2D, color: string): CanvasGradient {
  const g = ctx.createLinearGradient(0, 0, 0, 300);
  g.addColorStop(0, color + "40");
  g.addColorStop(0.6, color + "12");
  g.addColorStop(1, color + "00");
  return g;
}

const CHART_DEFAULTS = {
  scales: {
    x: {
      type: "linear" as const,
      title: { display: true, text: "Distance (m)", color: "#6B7280", font: { size: 10, family: "Inter" } },
      ticks: { color: "#6B7280", font: { size: 10 } },
      grid: { color: "#1E2535" },
      border: { color: "#1E2535" },
    },
    y: {
      ticks: { color: "#6B7280", font: { size: 10 } },
      grid: { color: "#1E253560" },
      border: { color: "#1E2535" },
    },
  },
};

export default function SpeedTrace({ driver1, driver2 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef  = useRef<Chart | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    chartRef.current?.destroy();

    const d1 = downsample(driver1.points);
    const d2 = downsample(driver2.points);

    const config: ChartConfiguration = {
      type: "line",
      data: {
        datasets: [
          {
            label: driver1.code,
            data: d1.map((p) => ({ x: p.distance ?? 0, y: p.speed ?? 0 })),
            borderColor: driver1.color,
            backgroundColor: makeGradient(ctx, driver1.color),
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.3,
            fill: true,
            order: 1,
          },
          {
            label: driver2.code,
            data: d2.map((p) => ({ x: p.distance ?? 0, y: p.speed ?? 0 })),
            borderColor: driver2.color,
            backgroundColor: makeGradient(ctx, driver2.color),
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.3,
            fill: true,
            order: 2,
          },
        ],
      },
      options: {
        responsive: true,
        animation: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            labels: {
              color: "#9CA3AF",
              font: { size: 11, family: "Inter", weight: 600 },
              boxWidth: 24,
              boxHeight: 2,
              padding: 16,
            },
          },
          tooltip: {
            backgroundColor: "#141821",
            borderColor: "#2E3D55",
            borderWidth: 1,
            titleColor: "#9CA3AF",
            bodyColor: "#FFFFFF",
            padding: 10,
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${(ctx.parsed.y as number).toFixed(1)} km/h`,
            },
          },
        },
        scales: {
          ...CHART_DEFAULTS.scales,
          y: {
            ...CHART_DEFAULTS.scales.y,
            title: { display: true, text: "Speed (km/h)", color: "#6B7280", font: { size: 10 } },
            min: 0,
          },
        },
      },
    };

    chartRef.current = new Chart(ctx, config);
    return () => chartRef.current?.destroy();
  }, [driver1, driver2]);

  return <canvas ref={canvasRef} style={{ height: "280px" }} />;
}
