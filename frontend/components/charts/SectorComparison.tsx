"use client";

import { useEffect, useRef } from "react";
import {
  Chart,
  BarController,
  BarElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  type ChartConfiguration,
} from "chart.js";
import type { Lap } from "@/types";
import { DRIVER_COLORS } from "@/types";

Chart.register(BarController, BarElement, LinearScale, CategoryScale, Tooltip, Legend);

interface Props {
  laps: Lap[];
  driverCode: string;
}

export default function SectorComparison({ laps, driverCode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef  = useRef<Chart | null>(null);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    chartRef.current?.destroy();

    const valid = laps
      .filter((l) => l.sector1 && l.sector2 && l.sector3 && l.lap_number)
      .slice(0, 60);

    if (!valid.length) return;

    const color = DRIVER_COLORS[driverCode.toUpperCase()] ?? "#E8002D";

    const config: ChartConfiguration = {
      type: "bar",
      data: {
        labels: valid.map((l) => `L${l.lap_number}`),
        datasets: [
          {
            label: "Sector 1",
            data: valid.map((l) => l.sector1 ?? 0),
            backgroundColor: "#FF180188",
            borderRadius: 2,
            stack: "s",
          },
          {
            label: "Sector 2",
            data: valid.map((l) => l.sector2 ?? 0),
            backgroundColor: "#F59E0B88",
            borderRadius: 2,
            stack: "s",
          },
          {
            label: "Sector 3",
            data: valid.map((l) => l.sector3 ?? 0),
            backgroundColor: "#1F8BFF88",
            borderRadius: 2,
            stack: "s",
          },
        ],
      },
      options: {
        responsive: true,
        animation: false,
        plugins: {
          legend: {
            labels: { color: "#9CA3AF", font: { size: 11, weight: 600 }, boxWidth: 12, boxHeight: 8, padding: 12 },
          },
          tooltip: {
            backgroundColor: "#141821",
            borderColor: "#2E3D55",
            borderWidth: 1,
            titleColor: "#9CA3AF",
            bodyColor: "#FFFFFF",
            padding: 10,
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${(ctx.parsed.y as number).toFixed(3)}s`,
            },
          },
        },
        scales: {
          x: {
            stacked: true,
            ticks: { color: "#6B7280", font: { size: 9 }, maxRotation: 0 },
            grid: { display: false },
            border: { color: "#1E2535" },
          },
          y: {
            stacked: true,
            title: { display: true, text: "Time (s)", color: "#6B7280", font: { size: 10 } },
            ticks: { color: "#6B7280", font: { size: 10 } },
            grid: { color: "#1E253560" },
            border: { color: "#1E2535" },
          },
        },
      },
    };

    chartRef.current = new Chart(ctx, config);
    return () => chartRef.current?.destroy();
  }, [laps, driverCode]);

  return (
    <div>
      <p className="text-xs text-[#8892a4] mb-2 font-mono">{driverCode} — Sector Times per Lap</p>
      <canvas ref={canvasRef} style={{ height: "220px" }} />
    </div>
  );
}
