// ─── Schedule ─────────────────────────────────────────────────────────────────

export interface RaceEvent {
  round: number;
  race_name: string;
  circuit: string;
  country: string;
  date: string;
  event_format?: string;
}

export interface ScheduleResponse {
  year: number;
  races: RaceEvent[];
  total: number;
}

// ─── Results ──────────────────────────────────────────────────────────────────

export interface RaceResult {
  position: number | null;
  driver_code: string;
  driver_name: string;
  team_name: string;
  grid_position: number | null;
  points: number;
  status: string;
  time_seconds: number | null;
  fastest_lap: boolean;
}

export interface DriverStanding {
  position: number;
  driver_code: string;
  driver_name: string;
  team_name: string;
  points: number;
  wins: number;
}

export interface ConstructorStanding {
  position: number;
  team_name: string;
  points: number;
  wins: number;
}

export interface StandingsResponse {
  year: number;
  driver_standings: DriverStanding[];
  constructor_standings: ConstructorStanding[];
}

// ─── Drivers ──────────────────────────────────────────────────────────────────

export interface Driver {
  driver_code: string;
  name: string;
  team: string | null;
  number: number | null;
  nationality: string | null;
  stats?: {
    races_entered: number;
    avg_lap_time: number | null;
    fastest_lap: number | null;
    personal_bests: number;
  };
}

// ─── Laps ─────────────────────────────────────────────────────────────────────

export interface Lap {
  lap_number: number;
  lap_time: number | null;
  lap_time_display: string | null;
  sector1: number | null;
  sector2: number | null;
  sector3: number | null;
  tyre_compound: string | null;
  tyre_life: number | null;
  stint: number | null;
  pit_in_time: number | null;
  pit_out_time: number | null;
  is_personal_best: number;
}

export interface LapsResponse {
  year: number;
  race: string;
  driver: string;
  session_type: string;
  laps: Lap[];
}

// ─── Telemetry ────────────────────────────────────────────────────────────────

export interface TelemetryPoint {
  distance: number | null;
  speed: number | null;
  throttle: number | null;
  brake: number | null;
  rpm: number | null;
  gear: number | null;
  drs: number | null;
  timestamp: number | null;
  x: number | null;
  y: number | null;
}

export interface TelemetryResponse {
  year: number;
  race: string;
  driver: string;
  lap_number: number;
  session_type: string;
  points: TelemetryPoint[];
}

export interface CompareTelemetryResponse {
  year: number;
  race: string;
  session_type: string;
  driver1: { code: string; lap: number; points: TelemetryPoint[] };
  driver2: { code: string; lap: number; points: TelemetryPoint[] };
}

export interface TrackPositionResponse {
  year: number;
  race: string;
  driver: string;
  session_type: string;
  lap_number: number;
  x: (number | null)[];
  y: (number | null)[];
  speed: (number | null)[];
  distance: (number | null)[];
}

// ─── Weather ──────────────────────────────────────────────────────────────────

export interface WeatherPoint {
  time: number | null;
  air_temp: number | null;
  track_temp: number | null;
  humidity: number | null;
  wind_speed: number | null;
  rainfall: number;
}

// ─── Strategy ─────────────────────────────────────────────────────────────────

export interface Stint {
  driver_code: string;
  stint: number;
  tyre_compound: string;
  start_lap: number;
  end_lap: number;
  lap_count: number;
}

export interface StrategyResponse {
  year: number;
  race: string;
  session_type: string;
  strategy: Record<string, Stint[]>;
}

// ─── Pit stops ────────────────────────────────────────────────────────────────

export interface PitStop {
  driver_code: string;
  lap_number: number;
  duration: number | null;
  stop_number: number;
}

export interface PitStopsResponse {
  year: number;
  race: string;
  session_type: string;
  pit_stops: PitStop[];
  summary: {
    total_stops: number;
    avg_duration: number | null;
    fastest_stop: number | null;
    slowest_stop: number | null;
  };
}

// ─── AI Prediction ────────────────────────────────────────────────────────────

export interface PredictionDriver {
  driver: string;
  team: string;
  grid_pos: number;
  probability: number;
  win_pct: number;
}

export interface PredictionResponse {
  year: number;
  round: number;
  race: string;
  circuit: string;
  session_type: string;
  model_version: string | null;
  algorithm: string | null;
  model_ready: boolean;
  cv_auc: number | null;
  predictions: PredictionDriver[];
  top_features: Record<string, number>;
  message?: string;
}

// ─── Tyre colours ─────────────────────────────────────────────────────────────

export const TYRE_COLORS: Record<string, string> = {
  SOFT:          "#FF3333",
  MEDIUM:        "#FFD700",
  HARD:          "#FFFFFF",
  INTERMEDIATE:  "#39B54A",
  WET:           "#0067FF",
  SUPERSOFT:     "#FF0000",
  ULTRASOFT:     "#CC00CC",
  HYPERSOFT:     "#FF69B4",
  UNKNOWN:       "#888888",
};

export const DRIVER_COLORS: Record<string, string> = {
  VER: "#3671C6",
  HAM: "#E8002D",  // Ferrari (2025–)
  LEC: "#E8002D",
  SAI: "#E8002D",
  NOR: "#FF8000",
  PIA: "#FF8000",
  RUS: "#27F4D2",
  ALO: "#358C75",
  STR: "#358C75",
  PER: "#3671C6",
  GAS: "#2293D1",
  OCO: "#2293D1",
  ALB: "#64C4FF",
  SAR: "#64C4FF",
  TSU: "#2B4562",
  RIC: "#2B4562",
  BOT: "#C92D4B",
  ZHO: "#C92D4B",
  HUL: "#B6BABD",
  MAG: "#B6BABD",
  BEA: "#3671C6",
  DOO: "#FF8000",
  ANT: "#27F4D2",
  HAD: "#2B4562",
};
