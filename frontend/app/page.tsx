"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchSchedule, fetchStandings } from "@/services/api";
import type { RaceEvent, DriverStanding, ConstructorStanding } from "@/types";
import { DRIVER_COLORS } from "@/types";
import StatCard from "@/components/cards/StatCard";
import StandingsTable from "@/components/tables/StandingsTable";
import RaceCard from "@/components/cards/RaceCard";

const CURRENT_YEAR = new Date().getFullYear();

function SkeletonRows({ n = 8 }: { n?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="skeleton h-8 rounded-lg" style={{ opacity: 1 - i * 0.07 }} />
      ))}
    </div>
  );
}

function PanelCard({ title, stripe = "red", children, className = "" }: {
  title: React.ReactNode;
  stripe?: "red" | "blue";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl overflow-hidden flex flex-col ${className}`}
      style={{ background: "#141821", border: "1px solid #1E2535" }}
    >
      <div className={stripe === "blue" ? "f1-stripe-blue" : "f1-stripe"} />
      <div className="p-4 flex-1 flex flex-col">
        <h2 className="section-header mb-4">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export default function HomePage() {
  const [schedule, setSchedule]   = useState<RaceEvent[]>([]);
  const [driverS, setDriverS]     = useState<DriverStanding[]>([]);
  const [constrS, setConstrS]     = useState<ConstructorStanding[]>([]);
  const [loading, setLoading]     = useState(true);
  const [year, setYear]           = useState(CURRENT_YEAR);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchSchedule(year), fetchStandings(year)])
      .then(([sched, standings]) => {
        setSchedule(sched.races);
        setDriverS(standings.driver_standings);
        setConstrS(standings.constructor_standings);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [year]);

  const now = new Date();
  const pastRaces     = schedule.filter((r) => new Date(r.date) < now);
  const upcomingRaces = schedule.filter((r) => new Date(r.date) >= now);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* â”€â”€ Header â”€â”€ */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">
            <span style={{ color: "#FF1801" }}>F1</span>{" "}
            <span className="text-white">Analytics</span>
          </h1>
          <p className="page-subtitle mt-1">Formula 1 performance data · seasons 2020 – 2026</p>
        </div>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="f1-select w-auto shrink-0"
          style={{ minWidth: "130px" }}
        >
          {[2020, 2021, 2022, 2023, 2024, 2025, 2026].map((y) => (
            <option key={y} value={y}>{y} Season</option>
          ))}
        </select>
      </div>

      {/* â”€â”€ Stat Cards â”€â”€ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Total Rounds"
          value={loading ? "—" : String(schedule.length)}
          sub={`${year} calendar`}
          icon="🏁"
          color="red"
        />
        <StatCard
          label="Races Done"
          value={loading ? "—" : String(pastRaces.length)}
          sub="as of today"
          icon="✅"
          color="green"
        />
        <StatCard
          label="Points Leader"
          value={loading ? "—" : (driverS[0]?.driver_code ?? "—")}
          sub={loading ? "" : `${driverS[0]?.points ?? 0} pts`}
          icon="🏆"
          color="yellow"
        />
        <StatCard
          label="Top Constructor"
          value={loading ? "—" : (constrS[0]?.team_name?.split(" ").slice(-1)[0] ?? "—")}
          sub={loading ? "" : `${constrS[0]?.points ?? 0} pts`}
          icon="🔧"
          color="blue"
        />
      </div>

      {/* ── Panels ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Driver standings */}
        <PanelCard title={<><span style={{ color: "#FF1801" }}>◈</span> Driver Championship</>}>
          {loading ? <SkeletonRows /> : <StandingsTable data={driverS.slice(0, 20)} type="driver" />}
        </PanelCard>

        {/* Constructor standings */}
        <PanelCard title={<><span style={{ color: "#1F8BFF" }}>◈</span> Constructors</>} stripe="blue">
          {loading ? <SkeletonRows /> : <StandingsTable data={constrS} type="constructor" />}
        </PanelCard>

        {/* Race calendar */}
        <PanelCard title={<>📅 Race Calendar <span className="ml-auto text-xs text-[#6B7280] font-normal">{year}</span></>}>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 7 }, (_, i) => (
                <div key={i} className="skeleton h-12 rounded-xl" style={{ opacity: 1 - i * 0.1 }} />
              ))}
            </div>
          ) : (
            <div className="space-y-1.5 overflow-y-auto max-h-[500px] pr-0.5">
              {schedule.map((race) => (
                <RaceCard key={race.round} race={race} year={year} />
              ))}
            </div>
          )}
        </PanelCard>
      </div>

      {/* â”€â”€ Recent Results â”€â”€ */}
      {!loading && pastRaces.length > 0 && (
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: "#141821", border: "1px solid #1E2535" }}
        >
          <div className="f1-stripe" />
          <div className="p-4">
            <h2 className="section-header mb-4">🎯 Recent Races</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {pastRaces.slice(-3).reverse().map((race) => (
                <a
                  key={race.round}
                  href={`/race/${year}/${race.round}`}
                  className="group block rounded-xl p-4 transition-all duration-150 hover:scale-[1.01]"
                  style={{ background: "#0D1019", border: "1px solid #1E2535" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#2E3D55"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#1E2535"; }}
                >
                  <div className="text-[10px] font-bold text-[#6B7280] uppercase tracking-widest mb-1">
                    Round {race.round}
                  </div>
                  <div className="font-bold text-white text-sm leading-snug">{race.race_name}</div>
                  <div className="text-xs text-[#6B7280] mt-1">
                    {race.circuit}, {race.country}
                  </div>
                  <div className="text-xs text-[#6B7280] mt-0.5">{race.date}</div>
                  <div
                    className="mt-3 text-xs font-semibold group-hover:underline"
                    style={{ color: "#FF1801" }}
                  >
                    View Results â†’
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

