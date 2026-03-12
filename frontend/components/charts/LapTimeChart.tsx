"use client";

import { useEffect, useRef, useState } from "react";
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
import { fetchLaps } from "@/services/api";
import type { Lap } from "@/types";
import { DRIVER_COLORS } from "@/types";

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend);

interface Props {
  year: number;
  race: string | number;
  drivers: string[];
}

export default function LapTimeChart({ year, race, drivers }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef  = useRef<Chart | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!drivers.length) return;
    setLoading(true);
    let mounted = true;

    Promise.all(
      drivers.map((d) =>
        fetchLaps(year, race, d)
          .then((res) => ({ driver: d, laps: res.laps }))
          .catch(() => ({ driver: d, laps: [] as Lap[] }))
      )
    ).then((allData) => {
      if (!mounted) return;
      setLoading(false);
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      chartRef.current?.destroy();

      const datasets = allData
        .filter((d) => d.laps.length > 0)
        .map((d) => {
          const color = DRIVER_COLORS[d.driver.toUpperCase()] ?? `hsl(${Math.random() * 360}, 70%, 60%)`;
          return {
            label: d.driver,
            data: d.laps
              .filter((l) => l.lap_time && l.lap_time > 0 && l.lap_number)
              .map((l) => ({ x: l.lap_number!, y: l.lap_time! })),
            borderColor: color,
            backgroundColor: color + "18",
            borderWidth: 2,
            pointRadius: 2.5,
            pointHoverRadius: 6,
            pointBackgroundColor: color,
            pointBorderColor: "#141821",
            pointBorderWidth: 1.5,
            tension: 0.2,
          };
        });

      const config: ChartConfiguration = {
        type: "line",
        data: { datasets },
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
              callbacks: {
                label: (ctx) => {
                  const sec = ctx.parsed.y as number;
                  const m = Math.floor(sec / 60);
                  const s = (sec - m * 60).toFixed(3);
                  return ` ${ctx.dataset.label}: ${m}:${s.padStart(6, "0")}`;
                },
              },
            },
          },
          scales: {
            x: {
              type: "linear",
              title: { display: true, text: "Lap", color: "#6B7280", font: { size: 10 } },
              ticks: { color: "#6B7280", font: { size: 10 }, stepSize: 5 },
              grid: { color: "#1E2535" },
              border: { color: "#1E2535" },
            },
            y: {
              title: { display: true, text: "Lap Time", color: "#6B7280", font: { size: 10 } },
              ticks: {
                color: "#6B7280",
                font: { size: 10 },
                callback: (v) => {
                  const sec = Number(v);
                  const m = Math.floor(sec / 60);
                  const s = Math.round(sec - m * 60);
                  return `${m}:${String(s).padStart(2, "0")}`;
                },
              },
              grid: { color: "#1E253560" },
              border: { color: "#1E2535" },
            },
          },
        },
      };

      chartRef.current = new Chart(ctx, config);
    });

    return () => {
      mounted = false;
      chartRef.current?.destroy();
    };
  }, [year, race, drivers.join(",")]);

  if (loading) return <div className="skeleton h-64 rounded" />;
  return <canvas ref={canvasRef} style={{ height: "280px" }} />;
}
