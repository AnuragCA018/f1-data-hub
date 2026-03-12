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
import type { Stint } from "@/types";
import { TYRE_COLORS } from "@/types";

Chart.register(BarController, BarElement, LinearScale, CategoryScale, Tooltip, Legend);

interface Props {
  strategy: Record<string, Stint[]>;
}

export default function TyreStrategy({ strategy }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef  = useRef<Chart | null>(null);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    chartRef.current?.destroy();

    const drivers = Object.keys(strategy);
    if (!drivers.length) return;

    // Gather all compounds used for building colour legend
    const compoundSet = new Set<string>();
    drivers.forEach((d) => strategy[d].forEach((s) => compoundSet.add(s.tyre_compound)));
    const compounds = [...compoundSet];

    // One dataset per compound, stacked
    const datasets = compounds.map((compound) => ({
      label: compound,
      data: drivers.map((d) => {
        const stints = strategy[d].filter((s) => s.tyre_compound === compound);
        return stints.reduce((acc, s) => acc + s.lap_count, 0);
      }),
      backgroundColor: TYRE_COLORS[compound.toUpperCase()] ?? "#888888",
      borderColor: "#0a0a0f",
      borderWidth: 1,
    }));

    const config: ChartConfiguration = {
      type: "bar",
      data: { labels: drivers, datasets },
      options: {
        indexAxis: "y" as const,
        responsive: true,
        animation: false,
        plugins: {
          legend: {
            labels: { color: "#9CA3AF", font: { size: 11, weight: 600 }, boxWidth: 16, boxHeight: 10, padding: 16 },
          },
          tooltip: {
            backgroundColor: "#141821",
            borderColor: "#2E3D55",
            borderWidth: 1,
            titleColor: "#9CA3AF",
            bodyColor: "#FFFFFF",
            padding: 10,
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.x} laps`,
            },
          },
        },
        scales: {
          x: {
            stacked: true,
            title: { display: true, text: "Laps", color: "#6B7280", font: { size: 10 } },
            ticks: { color: "#6B7280", font: { size: 10 } },
            grid: { color: "#1E2535" },
            border: { color: "#1E2535" },
          },
          y: {
            stacked: true,
            ticks: { color: "#9CA3AF", font: { size: 11, family: "JetBrains Mono, monospace", weight: 600 } },
            grid: { display: false },
            border: { color: "#1E2535" },
          },
        },
      },
    };

    chartRef.current = new Chart(ctx, config);
    return () => chartRef.current?.destroy();
  }, [strategy]);

  const driverCount = Object.keys(strategy).length;
  const height = Math.max(300, driverCount * 36);

  return <canvas ref={canvasRef} style={{ height: `${height}px` }} />;
}
