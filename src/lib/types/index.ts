// Centralized domain types for the Avalanche Rescue Command System frontend.
// The frontend only CONSUMES these values. All intelligence is produced by the
// backend (today: deterministic mock backend in src/lib/mock).

export type SensorId =
  | "rf"
  | "recco"
  | "gpr"
  | "thermal"
  | "rgb"
  | "seismic"
  | "acoustic"
  | "mobile_rf";

export type SensorState = "ACTIVE" | "DEGRADED" | "OFFLINE" | "UNAVAILABLE";

export type Priority = "P1" | "P2" | "P3";

export type RecommendedAction =
  | "PINPOINT_AND_PROBE"
  | "SECONDARY_SENSOR_SCAN"
  | "REMOTE_SENSING"
  | "DEFER"
  | "INSUFFICIENT_EVIDENCE";

export interface Incident {
  incident_id: string;
  location_name: string;
  avalanche_status: "ACTIVE" | "STABILIZING" | "CLEARED";
  last_known_position: { latitude: number; longitude: number };
  avalanche_flow_bearing_deg: number;
  suspected_victims: number;
  declared_at: string;
  elevation_m: number;
  data_source: "SIMULATED";
}

export interface EnvironmentalConditions {
  snow_depth_m: number;
  visibility: "GOOD" | "MODERATE" | "POOR";
  wind: "LOW" | "MODERATE" | "HIGH";
  temperature_c: number;
  data_source: "SIMULATED";
}

export interface SensorStatus {
  id: SensorId;
  label: string;
  short_label: string;
  state: SensorState;
  detail: string;
}

export interface SearchZone {
  zone_id: string;
  latitude: number;
  longitude: number;
  victim_probability: number | null; // null = no evidence-backed estimate
  priority: Priority | null;
  estimated_depth_m: number | null;
  localization_error_m: number | null;
  recommended_action: RecommendedAction;
  in_avalanche_path: boolean;
}

export interface SensorEvidence {
  sensor_id: SensorId;
  label: string;
  evidence: number | null; // null = sensor contributed no evidence
  signal_quality: number | null;
  environmental_quality: number | null;
  interference: number | null;
  visibility: "GOOD" | "MODERATE" | "POOR" | null;
  estimated_depth_m: number | null;
  localization_error_m: number | null;
  state: SensorState;
}

export interface ZoneDetails {
  zone: string;
  victim_probability: number | null;
  priority: Priority | null;
  recommended_action: RecommendedAction;
  alternative_actions: RecommendedAction[];
  location: { latitude: number; longitude: number; error_m: number | null };
  estimated_depth_m: number | null;
  contextual_prior: "HIGH" | "MODERATE" | "LOW";
  temporal_consistency: number | null;
  evidence: SensorEvidence[];
  explanation: { kind: "SUPPORT" | "CAUTION"; text: string }[];
  status_note: string | null;
}

export interface EvidenceEvent {
  timestamp: string;
  source: string;
  event: string;
  description: string;
}

export interface SystemStatus {
  backend: "ONLINE" | "OFFLINE";
  database: "ONLINE" | "OFFLINE";
  fusion_engine: "READY" | "BUSY" | "OFFLINE";
  websocket: "CONNECTED" | "DISCONNECTED";
  sensor_stream: "ACTIVE" | "IDLE";
  last_update: string;
  mode: "DEMO" | "BACKEND";
}

export interface ReplayEvent {
  t: string; // mm:ss
  seconds: number;
  title: string;
  source: string;
  description: string;
  scenario: ScenarioId;
  contextEstablished: boolean;
}

export interface AnalyticsMetrics {
  search_area: { initial_m2: number; prioritized_m2: number; reduction_pct: number };
  localization: {
    top1_success_pct: number;
    top3_recall_pct: number;
    mean_error_m: number;
    median_error_m: number;
    max_error_m: number;
  };
  robustness: {
    condition: string;
    p1_count: number;
    p2_count: number;
    p3_count: number;
    localization_error_m: number | null;
    search_area_m2: number;
    confidence: number | null;
    note: string | null;
  }[];
  priority_progression: { stage: string; priority: Priority | null; label: string }[];
  scenarios: {
    scenario: string;
    sensor_condition: string;
    ground_truth_zone: string;
    top_predicted_zone: string;
    top3_contains_victim: boolean;
    localization_error_m: number | null;
    p1_generated: boolean;
    recommended_action: RecommendedAction;
  }[];
}

// ---- Simulation ----

export type DemoAction =
  | "RESET_SCENARIO"
  | "GPR_DETECTION"
  | "RF_DETECTION"
  | "REMOVE_RF"
  | "DEGRADE_GPR"
  | "THERMAL_ANOMALY"
  | "CLEAR_THERMAL"
  | "SEISMIC_EVIDENCE";

export type ScenarioId =
  | "T0_NO_EVIDENCE"
  | "CONTEXT_ONLY"
  | "BASE_GPR"
  | "GPR_RF"
  | "GPR_DEGRADED"
  | "GPR_DEGRADED_RF"
  | "GPR_THERMAL_ANOMALY"
  | "GPR_RF_THERMAL"
  | "GPR_SEISMIC"
  | "GPR_RF_SEISMIC"
  | "GPR_NO_THERMAL"
  | "GPR_RF_NO_THERMAL";

export type MapLayerId =
  | "avalanche_boundary"
  | "last_known_position"
  | "search_grid"
  | "terrain"
  | "sensor_coverage"
  | "victim_candidates"
  | "sensor_observations"
  | "rescuer_locations";

export type MapLayers = Record<MapLayerId, boolean>;
