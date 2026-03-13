import type {
  ScheduleResponse,
  StandingsResponse,
  RaceResult,
  Driver,
  LapsResponse,
  TelemetryResponse,
  CompareTelemetryResponse,
  TrackPositionResponse,
  WeatherPoint,
  StrategyResponse,
  PitStopsResponse,
  PredictionResponse,
} from "@/types";

// ⚠️  This project uses Next.js static export (output: "export" in next.config.js).
// Static sites cannot use Next.js rewrites — they have no server!
// Therefore: NEXT_PUBLIC_API_URL MUST be set to the backend URL.
// If not set, all API requests will fail (404 or timeout).
const BASE = process.env.NEXT_PUBLIC_API_URL || "";

if (!BASE) {
  console.error(
    "❌ FATAL: NEXT_PUBLIC_API_URL not set. Frontend cannot reach backend API. " +
    "Set NEXT_PUBLIC_API_URL=https://f1-data-hub-kfhe.onrender.com in environment variables."
  );
}

async function apiFetch<T>(path: string, params?: Record<string, string>, timeoutMs = 120_000): Promise<T> {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  const url = `${BASE}${path}${qs}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(
        `Request timed out after ${timeoutMs / 1000}s. ` +
        "FastF1 is still downloading session data on first load (Render cold start). " +
        "Wait 1-2 minutes and refresh."
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Schedule ──────────────────────────────────────────────────────────────────
export const fetchSchedule = (year: number) =>
  apiFetch<ScheduleResponse>(`/api/schedule/${year}`);

// ─── Results / Standings ───────────────────────────────────────────────────────
export const fetchRaceResults = (year: number, race: string | number) =>
  apiFetch<{ year: number; race: string; results: RaceResult[] }>(`/api/results/${year}/${race}`);

export const fetchStandings = (year: number) =>
  apiFetch<StandingsResponse>(`/api/standings/${year}`);

// ─── Drivers ───────────────────────────────────────────────────────────────────
export const fetchAllDrivers = () =>
  apiFetch<{ drivers: Driver[] }>("/api/drivers");

export const fetchDriver = (code: string) =>
  apiFetch<Driver>(`/api/driver/${code}`);

// ─── Laps ──────────────────────────────────────────────────────────────────────
export const fetchLaps = (
  year: number,
  race: string | number,
  driver: string,
  sessionType = "R"
) =>
  apiFetch<LapsResponse>(`/api/laps/${year}/${race}/${driver}`, {
    session_type: sessionType,
  }, 5 * 60 * 1000);

// ─── Telemetry ─────────────────────────────────────────────────────────────────
export const fetchTelemetry = (
  year: number,
  race: string | number,
  driver: string,
  lap: number,
  sessionType = "R"
) =>
  apiFetch<TelemetryResponse>(`/api/telemetry/${year}/${race}/${driver}`, {
    lap: String(lap),
    session_type: sessionType,
  });

export const fetchTrackPosition = (
  year: number,
  race: string | number,
  driver: string,
  lap?: number,
  sessionType = "Q"
) =>
  apiFetch<TrackPositionResponse>(
    `/api/telemetry/track/${year}/${race}/${driver}`,
    {
      session_type: sessionType,
      ...(lap !== undefined ? { lap: String(lap) } : {}),
    },
    5 * 60 * 1000,
  );

export const fetchCompareTelemetry = (
  year: number,
  race: string | number,
  driver1: string,
  driver2: string,
  lap1: number,
  lap2: number,
  sessionType = "R"
) =>
  apiFetch<CompareTelemetryResponse>(
    `/api/telemetry/compare/${year}/${race}`,
    {
      driver1,
      driver2,
      lap1: String(lap1),
      lap2: String(lap2),
      session_type: sessionType,
    },
    5 * 60 * 1000, // 5-minute timeout — FastF1 may need to download full session data
  );

// ─── Weather ───────────────────────────────────────────────────────────────────
export const fetchWeather = (
  year: number,
  race: string | number,
  sessionType = "R"
) =>
  apiFetch<{ year: number; race: string; weather: WeatherPoint[] }>(
    `/api/weather/${year}/${race}`,
    { session_type: sessionType }
  );

// ─── Strategy ──────────────────────────────────────────────────────────────────
export const fetchStrategy = (
  year: number,
  race: string | number,
  sessionType = "R"
) =>
  apiFetch<StrategyResponse>(`/api/strategy/${year}/${race}`, {
    session_type: sessionType,
  });

// ─── Pit stops ─────────────────────────────────────────────────────────────────
export const fetchPitStops = (
  year: number,
  race: string | number,
  sessionType = "R"
) =>
  apiFetch<PitStopsResponse>(`/api/pitstops/${year}/${race}`, {
    session_type: sessionType,
  });

// ─── AI Prediction ─────────────────────────────────────────────────────────────
export const fetchWinnerPrediction = (
  year: number,
  round: number,
  sessionType = "R"
) =>
  apiFetch<PredictionResponse>(
    `/api/predict/winner/${year}/${round}`,
    { session_type: sessionType },
    5 * 60 * 1000, // FastF1 may need to download session data
  );
