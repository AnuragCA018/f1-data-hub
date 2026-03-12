"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { fetchRaceResults, fetchStrategy, fetchPitStops } from "@/services/api";
import type { RaceResult, StrategyResponse, PitStopsResponse } from "@/types";
import RaceResultsTable from "@/components/tables/RaceResultsTable";
import TyreStrategy from "@/components/charts/TyreStrategy";
import LapTimeChart from "@/components/charts/LapTimeChart";
import StatCard from "@/components/cards/StatCard";

export default function RaceClient() {
  const params = useParams<{ year: string; race: string }>();
  const year = Number(params.year);
  const race = params.race;

  const [results, setResults] = useState<RaceResult[]>([]);
  const [strategy, setStrategy] = useState<StrategyResponse | null>(null);
  const [pitStops, setPitStops] = useState<PitStopsResponse | null>(null);
  const [activeTab, setActiveTab] = useState<"results" | "strategy" | "laps" | "pitstops">("results");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchRaceResults(year, race),
      fetchStrategy(year, race),
      fetchPitStops(year, race),
    ])
      .then(([res, strat, pits]) => {
        setResults(res.results ?? []);
        setStrategy(strat);
        setPitStops(pits);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [year, race]);

  const winner = results.find((r) => r.position === 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="text-sm text-[#8892a4] mb-1">
          <a href="/" className="hover:text-white">Home</a>
          <span className="mx-2">/</span>
          <span>{year}</span>
          <span className="mx-2">/</span>
          <span>Round {race}</span>
        </div>
        <h1 className="text-2xl font-bold text-white">
          Race Analysis — Round {race}, {year}
        </h1>
      </div>

      {error && (
        <div className="card p-4 text-[#FF1801] text-sm">
          ⚠ {error} — Data may still be loading from FastF1.
        </div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Winner" value={winner?.driver_name?.split(" ").pop() ?? "TBD"} sub={winner?.team_name ?? ""} icon="🏆" color="yellow" />
        <StatCard label="Total Finishers" value={String(results.filter((r) => r.status === "Finished" || r.position).length)} sub="classified" icon="✅" color="green" />
        <StatCard label="Fastest Pit" value={pitStops?.summary.fastest_stop ? `${pitStops.summary.fastest_stop.toFixed(2)}s` : "—"} sub="pit stop" icon="⚡" color="red" />
        <StatCard label="Total Pit Stops" value={String(pitStops?.summary.total_stops ?? "—")} sub="all drivers" icon="🛞" color="blue" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#1E2535]">
        {(["results", "strategy", "laps", "pitstops"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? "border-[#FF1801] text-white"
                : "border-transparent text-[#9CA3AF] hover:text-white"
            }`}
          >
            {tab === "pitstops" ? "Pit Stops" : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="skeleton h-10 rounded" />
          ))}
        </div>
      ) : (
        <>
          {activeTab === "results" && (
            <div className="card p-0 overflow-hidden">
              <div className="f1-stripe" />
              <div className="p-4">
                <h2 className="section-header mb-4">🏁 Race Results</h2>
                <RaceResultsTable results={results} />
              </div>
            </div>
          )}

          {activeTab === "strategy" && strategy && (
            <div className="card p-0 overflow-hidden">
              <div className="f1-stripe" />
              <div className="p-4">
                <h2 className="section-header mb-4">🛞 Tyre Strategy</h2>
                <TyreStrategy strategy={strategy.strategy} />
              </div>
            </div>
          )}

          {activeTab === "laps" && (
            <div className="card p-0 overflow-hidden">
              <div className="f1-stripe" />
              <div className="p-4">
                <h2 className="section-header mb-4">⏱ Lap Time Evolution</h2>
                <LapTimeChart year={year} race={race} drivers={results.slice(0, 5).map((r) => r.driver_code)} />
              </div>
            </div>
          )}

          {activeTab === "pitstops" && pitStops && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Stops" value={String(pitStops.summary.total_stops)} sub="" icon="🛑" color="red" />
                <StatCard label="Avg Duration" value={pitStops.summary.avg_duration ? `${pitStops.summary.avg_duration.toFixed(2)}s` : "—"} sub="" icon="⏱" color="blue" />
                <StatCard label="Fastest Stop" value={pitStops.summary.fastest_stop ? `${pitStops.summary.fastest_stop.toFixed(2)}s` : "—"} sub="" icon="⚡" color="green" />
                <StatCard label="Slowest Stop" value={pitStops.summary.slowest_stop ? `${pitStops.summary.slowest_stop.toFixed(2)}s` : "—"} sub="" icon="🐢" color="yellow" />
              </div>
              <div className="card p-0 overflow-hidden">
                <div className="f1-stripe" />
                <div className="p-4">
                  <h2 className="section-header mb-4">🛑 Pit Stop Log</h2>
                  <div className="overflow-x-auto">
                    <table className="f1-table">
                      <thead>
                        <tr>
                          <th>Driver</th>
                          <th>Stop #</th>
                          <th>Lap</th>
                          <th>Duration</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pitStops.pit_stops.map((ps, i) => (
                          <tr key={i}>
                            <td className="font-mono font-semibold">{ps.driver_code}</td>
                            <td>{ps.stop_number}</td>
                            <td>{ps.lap_number}</td>
                            <td className="font-mono">
                              {ps.duration ? `${ps.duration.toFixed(2)}s` : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
