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
  type ChartConfiguration,
} from "chart.js";
import type { TelemetryPoint } from "@/types";

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend);

interface DriverData {
  code: string;
  points: TelemetryPoint[];
  color: string;
}

interface Props {
  driver1: DriverData;
  driver2: DriverData;
  /** "gear" | "rpmKnorm" (RPM / 1000) | "drs" */
  channel?: "gear" | "rpm" | "drs";
}

function downsample(points: TelemetryPoint[], target = 400): TelemetryPoint[] {
  if (points.length <= target) return points;
  const factor = Math.ceil(points.length / target);
  return points.filter((_, i) => i % factor === 0);
}

function getVal(p: TelemetryPoint, ch: string): number {
  if (ch === "gear") return p.gear ?? 0;
  if (ch === "rpm")  return (p.rpm ?? 0) / 1000;
  if (ch === "drs")  return p.drs ?? 0;
  return 0;
}

const TITLES: Record<string, string> = {
  gear: "Gear",
  rpm:  "RPM (× 1000)",
  drs:  "DRS Status",
};

export default function GearTrace({ driver1, driver2, channel = "gear" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef  = useRef<Chart | null>(null);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    chartRef.current?.destroy();

    const d1 = downsample(driver1.points);
    const d2 = downsample(driver2.points);
    const yLabel = TITLES[channel] ?? channel;

    const config: ChartConfiguration = {
      type: "line",
      data: {
        datasets: [
          {
            label: driver1.code,
            data: d1.map((p) => ({ x: p.distance ?? 0, y: getVal(p, channel) })),
            borderColor: driver1.color,
            backgroundColor: driver1.color + "20",
            borderWidth: 1.5,
            pointRadius: 0,
            tension: 0.1,
            stepped: channel === "gear" || channel === "drs" ? "before" : false,
          },
          {
            label: driver2.code,
            data: d2.map((p) => ({ x: p.distance ?? 0, y: getVal(p, channel) })),
            borderColor: driver2.color,
            backgroundColor: driver2.color + "10",
            borderWidth: 1.5,
            pointRadius: 0,
            tension: 0.1,
            stepped: channel === "gear" || channel === "drs" ? "before" : false,
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
              font: { size: 11, weight: 600 },
              boxWidth: 20,
              boxHeight: 2,
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
              label: (ctx) => {
                const v = ctx.parsed.y as number;
                if (channel === "gear") return ` ${ctx.dataset.label}: Gear ${v}`;
                if (channel === "drs")  return ` ${ctx.dataset.label}: DRS ${v > 0 ? "Open" : "Closed"}`;
                return ` ${ctx.dataset.label}: ${v.toFixed(1)}`;
              },
            },
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
            ticks: {
              color: "#6B7280",
              font: { size: 10 },
              stepSize: channel === "gear" ? 1 : undefined,
            },
            grid: { color: "#1E253560" },
            border: { color: "#1E2535" },
            min: 0,
            max: channel === "gear" ? 8 : undefined,
          },
        },
      },
    };

    chartRef.current = new Chart(ctx, config);
    return () => chartRef.current?.destroy();
  }, [driver1, driver2, channel]);

  return <canvas ref={canvasRef} style={{ height: "200px" }} />;
}
