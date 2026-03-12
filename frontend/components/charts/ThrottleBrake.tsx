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
  channel: "throttle" | "brake";
}

function downsample(points: TelemetryPoint[], target = 400): TelemetryPoint[] {
  if (points.length <= target) return points;
  const factor = Math.ceil(points.length / target);
  return points.filter((_, i) => i % factor === 0);
}

function makeGradient(ctx: CanvasRenderingContext2D, color: string): CanvasGradient {
  const g = ctx.createLinearGradient(0, 0, 0, 220);
  g.addColorStop(0, color + "35");
  g.addColorStop(1, color + "00");
  return g;
}

export default function ThrottleBrake({ driver1, driver2, channel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef  = useRef<Chart | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    chartRef.current?.destroy();

    const d1 = downsample(driver1.points);
    const d2 = downsample(driver2.points);

    const isThrottle = channel === "throttle";
    const yLabel = isThrottle ? "Throttle (%)" : "Brake";
    const yMax   = isThrottle ? 100 : 1;

    const config: ChartConfiguration = {
      type: "line",
      data: {
        datasets: [
          {
            label: driver1.code,
            data: d1.map((p) => ({
              x: p.distance ?? 0,
              y: isThrottle ? (p.throttle ?? 0) : (p.brake ?? 0),
            })),
            borderColor: driver1.color,
            backgroundColor: makeGradient(ctx, driver1.color),
            borderWidth: 1.5,
            pointRadius: 0,
            tension: 0.15,
            fill: true,
          },
          {
            label: driver2.code,
            data: d2.map((p) => ({
              x: p.distance ?? 0,
              y: isThrottle ? (p.throttle ?? 0) : (p.brake ?? 0),
            })),
            borderColor: driver2.color,
            backgroundColor: makeGradient(ctx, driver2.color),
            borderWidth: 1.5,
            pointRadius: 0,
            tension: 0.15,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        animation: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            labels: { color: "#9CA3AF", font: { size: 11, weight: 600 }, boxWidth: 20, boxHeight: 2 },
          },
          tooltip: {
            backgroundColor: "#141821",
            borderColor: "#2E3D55",
            borderWidth: 1,
            titleColor: "#9CA3AF",
            bodyColor: "#FFFFFF",
            padding: 10,
          },
        },
        scales: {
          x: {
            type: "linear",
            title: { display: true, text: "Distance (m)", color: "#6B7280", font: { size: 10 } },
            ticks: { color: "#6B7280", font: { size: 10 } },
            grid: { color: "#1E2535" },
            border: { color: "#1E2535" },
          },
          y: {
            title: { display: true, text: yLabel, color: "#6B7280", font: { size: 10 } },
            ticks: { color: "#6B7280", font: { size: 10 } },
            grid: { color: "#1E253560" },
            border: { color: "#1E2535" },
            min: 0,
            max: yMax,
          },
        },
      },
    };

    chartRef.current = new Chart(ctx, config);
    return () => chartRef.current?.destroy();
  }, [driver1, driver2, channel]);

  return <canvas ref={canvasRef} style={{ height: "220px" }} />;
}


interface DriverData {
  code: string;
  points: TelemetryPoint[];
  color: string;
}
