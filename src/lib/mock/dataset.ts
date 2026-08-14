// DETERMINISTIC prototype dataset. No Math.random() anywhere.
// This module stands in for the future Python/FastAPI backend. All fusion
// results, priorities and recommendations are pre-authored scenario outputs.

import type {
  EnvironmentalConditions,
  Incident,
  MapLayers,
  Priority,
  RecommendedAction,
  ReplayEvent,
  ScenarioId,
  SensorEvidence,
  SensorId,
  SensorState,
  SensorStatus,
} from "@/lib/types";

export const INCIDENT: Incident = {
  incident_id: "INC-2026-001",
  location_name: "High-altitude avalanche search zone",
  avalanche_status: "ACTIVE",
  last_known_position: { latitude: 34.1234, longitude: 77.4567 },
  avalanche_flow_bearing_deg: 212,
  suspected_victims: 3,
  declared_at: "10:29:41",
  elevation_m: 4180,
  data_source: "SIMULATED",
};

export const ENVIRONMENT: EnvironmentalConditions = {
  snow_depth_m: 1.8,
  visibility: "POOR",
  wind: "HIGH",
  temperature_c: -12,
  data_source: "SIMULATED",
};

export const DEFAULT_LAYERS: MapLayers = {
  avalanche_boundary: true,
  last_known_position: true,
  search_grid: true,
  terrain: true,
  sensor_coverage: false,
  victim_candidates: true,
  sensor_observations: true,
  rescuer_locations: true,
};

export const SENSOR_META: {
  id: SensorId;
  label: string;
  short_label: string;
  frequencyNote: string;
}[] = [
  { id: "rf", label: "457 kHz RF / Avalanche Transceiver", short_label: "RF", frequencyNote: "457 kHz" },
  { id: "recco", label: "RECCO Harmonic Radar", short_label: "RECCO", frequencyNote: "917 MHz" },
  { id: "gpr", label: "GPR / Life-Sign Radar", short_label: "GPR", frequencyNote: "400 MHz–1.6 GHz" },
  { id: "thermal", label: "Thermal Imaging (UAV)", short_label: "THERMAL", frequencyNote: "LWIR" },
  { id: "rgb", label: "RGB Optical (UAV)", short_label: "RGB", frequencyNote: "Visible" },
  { id: "seismic", label: "Seismic Geophone Array", short_label: "SEISMIC", frequencyNote: "1–200 Hz" },
  { id: "acoustic", label: "Acoustic Array", short_label: "ACOUSTIC", frequencyNote: "0.1–8 kHz" },
  { id: "mobile_rf", label: "Mobile RF / Handset Sniffer", short_label: "MOBILE RF", frequencyNote: "GSM/LTE" },
];

// ---------------------------------------------------------------------------
// Search grid geometry (6 x 4 = 24 cells)
// ---------------------------------------------------------------------------

export const GRID_COLS = ["A", "B", "C", "D", "E", "F"] as const;
export const GRID_ROWS = [1, 2, 3, 4] as const;

const CELL_LAT = 0.0003;
const CELL_LON = 0.00038;
const ORIGIN_LAT = 34.1244;
const ORIGIN_LON = 77.4548;

export const CELL_AREA_M2 = 420;

export function cellCenter(zoneId: string) {
  const col = GRID_COLS.indexOf(zoneId[0] as (typeof GRID_COLS)[number]);
  const row = Number(zoneId.slice(1)) - 1;
  return {
    latitude: Number((ORIGIN_LAT - row * CELL_LAT - CELL_LAT / 2).toFixed(6)),
    longitude: Number((ORIGIN_LON + col * CELL_LON + CELL_LON / 2).toFixed(6)),
  };
}

export const ALL_ZONE_IDS: string[] = GRID_ROWS.flatMap((r) => GRID_COLS.map((c) => `${c}${r}`));

// Cells inside the modelled avalanche deposition path.
export const IN_PATH_ZONES = new Set([
  "A1",
  "B1",
  "C1",
  "B2",
  "C2",
  "D2",
  "B3",
  "C3",
  "D3",
  "E3",
  "C4",
  "D4",
  "E4",
]);

// ---------------------------------------------------------------------------
// Scenario outputs
// ---------------------------------------------------------------------------

export interface ZoneOutput {
  probability: number | null;
  priority: Priority | null;
  action: RecommendedAction;
  depth_m: number | null;
  error_m: number | null;
}

export interface ScenarioOutput {
  label: string;
  sensors: Partial<Record<SensorId, SensorState>>;
  contextualPrior: "HIGH" | "MODERATE" | "LOW";
  temporalConsistency: number | null;
  /** Zone-level fusion output. Zones not listed fall back to CONTEXT_BASELINE. */
  zones: Record<string, ZoneOutput>;
  /** Per-sensor evidence + quality for the primary candidate zones. */
  evidence: Record<string, Partial<Record<SensorId, Partial<SensorEvidence>>>>;
  explanation: Record<string, { kind: "SUPPORT" | "CAUTION"; text: string }[]>;
  statusNote?: string | null;
}

/** Context-only prior for every non-highlighted cell (deterministic). */
const CONTEXT_BASELINE: Record<string, ZoneOutput> = {};
const BASELINE_PRIORS: Record<string, number> = {
  A1: 0.09, B1: 0.14, C1: 0.12, D1: 0.05, E1: 0.03, F1: 0.02,
  A2: 0.07, B2: 0.21, C2: 0.18, D2: 0.13, E2: 0.06, F2: 0.03,
  A3: 0.05, B3: 0.16, C3: 0.19, D3: 0.15, E3: 0.11, F3: 0.04,
  A4: 0.03, B4: 0.08, C4: 0.12, D4: 0.14, E4: 0.1, F4: 0.05,
};
for (const id of ALL_ZONE_IDS) {
  const p = BASELINE_PRIORS[id] ?? 0.02;
  CONTEXT_BASELINE[id] = {
    probability: p,
    priority: p >= 0.18 ? "P2" : "P3",
    action: p >= 0.18 ? "SECONDARY_SENSOR_SCAN" : "DEFER",
    depth_m: null,
    error_m: null,
  };
}

export const CONTEXT_PRIOR_ZONES = CONTEXT_BASELINE;

const DEFAULT_SENSORS: Record<SensorId, SensorState> = {
  rf: "UNAVAILABLE",
  recco: "UNAVAILABLE",
  gpr: "ACTIVE",
  thermal: "DEGRADED",
  rgb: "DEGRADED",
  seismic: "UNAVAILABLE",
  acoustic: "OFFLINE",
  mobile_rf: "DEGRADED",
};

export function resolveSensors(scenario: ScenarioOutput): SensorStatus[] {
  return SENSOR_META.map((meta) => {
    const state = scenario.sensors[meta.id] ?? DEFAULT_SENSORS[meta.id];
    return {
      id: meta.id,
      label: meta.label,
      short_label: meta.short_label,
      state,
      detail: meta.frequencyNote,
    };
  });
}

const SUPPORT = (text: string) => ({ kind: "SUPPORT" as const, text });
const CAUTION = (text: string) => ({ kind: "CAUTION" as const, text });

export const SCENARIOS: Record<ScenarioId, ScenarioOutput> = {
  T0_NO_EVIDENCE: {
    label: "Incident declared — no search context, no sensor evidence",
    sensors: { gpr: "UNAVAILABLE", thermal: "UNAVAILABLE", rgb: "UNAVAILABLE", mobile_rf: "UNAVAILABLE" },
    contextualPrior: "LOW",
    temporalConsistency: null,
    zones: Object.fromEntries(
      ALL_ZONE_IDS.map((id) => [
        id,
        { probability: null, priority: null, action: "INSUFFICIENT_EVIDENCE" as RecommendedAction, depth_m: null, error_m: null },
      ]),
    ),
    evidence: {},
    explanation: {},
    statusNote: "INSUFFICIENT EVIDENCE — ADDITIONAL SENSOR INPUT REQUIRED",
  },

  CONTEXT_ONLY: {
    label: "Search context established — contextual prior only",
    sensors: { gpr: "UNAVAILABLE", thermal: "DEGRADED" },
    contextualPrior: "MODERATE",
    temporalConsistency: null,
    zones: CONTEXT_BASELINE,
    evidence: {},
    explanation: {
      B2: [
        SUPPORT("Cell lies on modelled avalanche flow line from last-known position"),
        CAUTION("No sensor evidence yet — contextual prior only"),
      ],
    },
    statusNote: "NO CURRENT SENSOR EVIDENCE — CONTEXTUAL PRIOR ONLY",
  },

  BASE_GPR: {
    label: "GPR active, RF unavailable, thermal degraded",
    sensors: {},
    contextualPrior: "HIGH",
    temporalConsistency: 0.74,
    zones: {
      B2: { probability: 0.72, priority: "P2", action: "SECONDARY_SENSOR_SCAN", depth_m: 1.3, error_m: 1.1 },
      C3: { probability: 0.51, priority: "P2", action: "SECONDARY_SENSOR_SCAN", depth_m: 1.7, error_m: 1.6 },
      C2: { probability: 0.34, priority: "P3", action: "REMOTE_SENSING", depth_m: 2.1, error_m: 2.2 },
      D4: { probability: 0.17, priority: "P3", action: "DEFER", depth_m: null, error_m: null },
      B3: { probability: 0.22, priority: "P3", action: "REMOTE_SENSING", depth_m: null, error_m: null },
      D3: { probability: 0.15, priority: "P3", action: "DEFER", depth_m: null, error_m: null },
    },
    evidence: {
      B2: {
        gpr: { evidence: 0.72, signal_quality: 0.86, environmental_quality: 0.82, estimated_depth_m: 1.3, localization_error_m: 0.8 },
        thermal: { evidence: 0.11, signal_quality: 0.43, environmental_quality: 0.41, visibility: "POOR" },
      },
      C3: {
        gpr: { evidence: 0.55, signal_quality: 0.71, environmental_quality: 0.8, estimated_depth_m: 1.7, localization_error_m: 1.4 },
      },
      C2: {
        gpr: { evidence: 0.31, signal_quality: 0.66, environmental_quality: 0.79, estimated_depth_m: 2.1, localization_error_m: 2.0 },
      },
    },
    explanation: {
      B2: [
        SUPPORT("Moderate GPR sub-surface candidate signature"),
        SUPPORT("High contextual prior from flow-line propagation"),
        CAUTION("No confirming person-associated RF evidence"),
        CAUTION("Additional sensor input recommended before committing rescuers"),
      ],
      C3: [
        SUPPORT("Weak-to-moderate GPR evidence"),
        CAUTION("Evidence not spatially confirmed by a second modality"),
      ],
      D4: [CAUTION("Contextual prior only — no supporting sensor evidence")],
    },
  },

  GPR_RF: {
    label: "GPR active + person-associated RF detection",
    sensors: { rf: "ACTIVE" },
    contextualPrior: "HIGH",
    temporalConsistency: 0.88,
    zones: {
      B2: { probability: 0.91, priority: "P1", action: "PINPOINT_AND_PROBE", depth_m: 1.2, error_m: 0.7 },
      C3: { probability: 0.64, priority: "P2", action: "SECONDARY_SENSOR_SCAN", depth_m: 1.7, error_m: 1.5 },
      C2: { probability: 0.33, priority: "P3", action: "REMOTE_SENSING", depth_m: 2.1, error_m: 2.2 },
      D4: { probability: 0.17, priority: "P3", action: "DEFER", depth_m: null, error_m: null },
      B3: { probability: 0.21, priority: "P3", action: "REMOTE_SENSING", depth_m: null, error_m: null },
      D3: { probability: 0.14, priority: "P3", action: "DEFER", depth_m: null, error_m: null },
    },
    evidence: {
      B2: {
        gpr: { evidence: 0.72, signal_quality: 0.86, environmental_quality: 0.82, estimated_depth_m: 1.3, localization_error_m: 0.8 },
        rf: { evidence: 0.94, signal_quality: 0.91, interference: 0.12, localization_error_m: 0.5 },
        thermal: { evidence: 0.38, signal_quality: 0.43, environmental_quality: 0.41, visibility: "POOR" },
      },
      C3: {
        gpr: { evidence: 0.55, signal_quality: 0.71, environmental_quality: 0.8, estimated_depth_m: 1.7, localization_error_m: 1.4 },
        rf: { evidence: 0.29, signal_quality: 0.62, interference: 0.18, localization_error_m: 1.9 },
      },
      C2: {
        gpr: { evidence: 0.31, signal_quality: 0.66, environmental_quality: 0.79, estimated_depth_m: 2.1, localization_error_m: 2.0 },
      },
    },
    explanation: {
      B2: [
        SUPPORT("Strong person-associated RF evidence (457 kHz transceiver signature)"),
        SUPPORT("Supporting GPR sub-surface evidence"),
        SUPPORT("High contextual prior"),
        SUPPORT("Evidence spatially consistent across modalities"),
        SUPPORT("Sensor quality currently acceptable"),
      ],
      C3: [
        SUPPORT("Moderate GPR evidence"),
        CAUTION("RF return weak and not spatially confirmed"),
        CAUTION("Additional sensor input recommended"),
      ],
      D4: [CAUTION("Contextual prior only — no supporting sensor evidence")],
    },
  },

  GPR_DEGRADED: {
    label: "GPR degraded, RF unavailable",
    sensors: { gpr: "DEGRADED" },
    contextualPrior: "HIGH",
    temporalConsistency: 0.46,
    zones: {
      B2: { probability: 0.46, priority: "P3", action: "REMOTE_SENSING", depth_m: null, error_m: 3.4 },
      C3: { probability: 0.28, priority: "P3", action: "REMOTE_SENSING", depth_m: null, error_m: 4.1 },
      C2: { probability: 0.2, priority: "P3", action: "DEFER", depth_m: null, error_m: null },
      D4: { probability: 0.14, priority: "P3", action: "DEFER", depth_m: null, error_m: null },
    },
    evidence: {
      B2: {
        gpr: { evidence: 0.44, signal_quality: 0.31, environmental_quality: 0.27, estimated_depth_m: null, localization_error_m: 3.4 },
        thermal: { evidence: 0.11, signal_quality: 0.43, environmental_quality: 0.41, visibility: "POOR" },
      },
      C3: {
        gpr: { evidence: 0.26, signal_quality: 0.29, environmental_quality: 0.27, estimated_depth_m: null, localization_error_m: 4.1 },
      },
    },
    explanation: {
      B2: [
        SUPPORT("GPR candidate signature still present"),
        CAUTION("GPR signal quality degraded (31%) — depth estimate withheld"),
        CAUTION("Environmental quality degraded (27%)"),
        CAUTION("Localization uncertainty too large for pinpoint probing"),
      ],
    },
    statusNote: "SENSOR QUALITY DEGRADED — CONFIDENCE REDUCED BY BACKEND",
  },

  GPR_DEGRADED_RF: {
    label: "GPR degraded but person-associated RF present",
    sensors: { gpr: "DEGRADED", rf: "ACTIVE" },
    contextualPrior: "HIGH",
    temporalConsistency: 0.79,
    zones: {
      B2: { probability: 0.83, priority: "P1", action: "PINPOINT_AND_PROBE", depth_m: null, error_m: 0.9 },
      C3: { probability: 0.37, priority: "P3", action: "REMOTE_SENSING", depth_m: null, error_m: 3.6 },
      C2: { probability: 0.19, priority: "P3", action: "DEFER", depth_m: null, error_m: null },
    },
    evidence: {
      B2: {
        gpr: { evidence: 0.44, signal_quality: 0.31, environmental_quality: 0.27, estimated_depth_m: null, localization_error_m: 3.4 },
        rf: { evidence: 0.94, signal_quality: 0.91, interference: 0.12, localization_error_m: 0.5 },
      },
    },
    explanation: {
      B2: [
        SUPPORT("Strong person-associated RF evidence dominates the fusion result"),
        CAUTION("GPR degraded — depth estimate unavailable"),
        SUPPORT("RF localization error acceptable for pinpointing"),
      ],
    },
  },

  GPR_THERMAL_ANOMALY: {
    label: "Thermal anomaly under poor visibility",
    sensors: { thermal: "DEGRADED" },
    contextualPrior: "HIGH",
    temporalConsistency: 0.69,
    zones: {
      B2: { probability: 0.74, priority: "P2", action: "SECONDARY_SENSOR_SCAN", depth_m: 1.3, error_m: 1.1 },
      C3: { probability: 0.52, priority: "P2", action: "SECONDARY_SENSOR_SCAN", depth_m: 1.7, error_m: 1.6 },
      E3: { probability: 0.31, priority: "P3", action: "REMOTE_SENSING", depth_m: null, error_m: 2.8 },
      D4: { probability: 0.17, priority: "P3", action: "DEFER", depth_m: null, error_m: null },
    },
    evidence: {
      B2: {
        gpr: { evidence: 0.72, signal_quality: 0.86, environmental_quality: 0.82, estimated_depth_m: 1.3, localization_error_m: 0.8 },
        thermal: { evidence: 0.68, signal_quality: 0.43, environmental_quality: 0.41, visibility: "POOR" },
      },
      E3: {
        thermal: { evidence: 0.68, signal_quality: 0.43, environmental_quality: 0.41, visibility: "POOR" },
      },
    },
    explanation: {
      B2: [
        SUPPORT("Supporting GPR evidence"),
        SUPPORT("Thermal anomaly co-located with GPR candidate"),
        CAUTION("Thermal quality poor (43%) — anomaly down-weighted by backend"),
        CAUTION("No person-associated RF evidence"),
      ],
      E3: [
        SUPPORT("Thermal anomaly reported (68%)"),
        CAUTION("Poor visibility and low environmental quality (41%)"),
        CAUTION("Anomaly alone does not justify a P1 search commitment"),
      ],
    },
  },

  GPR_RF_THERMAL: {
    label: "GPR + RF + thermal anomaly",
    sensors: { rf: "ACTIVE" },
    contextualPrior: "HIGH",
    temporalConsistency: 0.9,
    zones: {
      B2: { probability: 0.93, priority: "P1", action: "PINPOINT_AND_PROBE", depth_m: 1.2, error_m: 0.6 },
      C3: { probability: 0.64, priority: "P2", action: "SECONDARY_SENSOR_SCAN", depth_m: 1.7, error_m: 1.5 },
      E3: { probability: 0.3, priority: "P3", action: "REMOTE_SENSING", depth_m: null, error_m: 2.8 },
    },
    evidence: {
      B2: {
        gpr: { evidence: 0.72, signal_quality: 0.86, environmental_quality: 0.82, estimated_depth_m: 1.3, localization_error_m: 0.8 },
        rf: { evidence: 0.94, signal_quality: 0.91, interference: 0.12, localization_error_m: 0.5 },
        thermal: { evidence: 0.68, signal_quality: 0.43, environmental_quality: 0.41, visibility: "POOR" },
      },
    },
    explanation: {
      B2: [
        SUPPORT("Strong person-associated RF evidence"),
        SUPPORT("Supporting GPR evidence"),
        SUPPORT("Thermal anomaly consistent with candidate location"),
        SUPPORT("Evidence spatially and temporally consistent"),
      ],
    },
  },

  GPR_SEISMIC: {
    label: "GPR + seismic movement evidence",
    sensors: { seismic: "ACTIVE" },
    contextualPrior: "HIGH",
    temporalConsistency: 0.81,
    zones: {
      B2: { probability: 0.79, priority: "P2", action: "SECONDARY_SENSOR_SCAN", depth_m: 1.3, error_m: 1.0 },
      C3: { probability: 0.55, priority: "P2", action: "SECONDARY_SENSOR_SCAN", depth_m: 1.7, error_m: 1.5 },
      D4: { probability: 0.17, priority: "P3", action: "DEFER", depth_m: null, error_m: null },
    },
    evidence: {
      B2: {
        gpr: { evidence: 0.72, signal_quality: 0.86, environmental_quality: 0.82, estimated_depth_m: 1.3, localization_error_m: 0.8 },
        seismic: { evidence: 0.57, signal_quality: 0.74, environmental_quality: 0.66, localization_error_m: 2.4 },
      },
    },
    explanation: {
      B2: [
        SUPPORT("Supporting GPR evidence"),
        SUPPORT("Seismic array reports movement-consistent transient"),
        CAUTION("Seismic localization coarse (±2.4 m)"),
        CAUTION("No person-associated RF evidence"),
      ],
    },
  },

  GPR_RF_SEISMIC: {
    label: "GPR + RF + seismic",
    sensors: { rf: "ACTIVE", seismic: "ACTIVE" },
    contextualPrior: "HIGH",
    temporalConsistency: 0.94,
    zones: {
      B2: { probability: 0.94, priority: "P1", action: "PINPOINT_AND_PROBE", depth_m: 1.2, error_m: 0.6 },
      C3: { probability: 0.66, priority: "P2", action: "SECONDARY_SENSOR_SCAN", depth_m: 1.7, error_m: 1.5 },
    },
    evidence: {
      B2: {
        gpr: { evidence: 0.72, signal_quality: 0.86, environmental_quality: 0.82, estimated_depth_m: 1.3, localization_error_m: 0.8 },
        rf: { evidence: 0.94, signal_quality: 0.91, interference: 0.12, localization_error_m: 0.5 },
        seismic: { evidence: 0.57, signal_quality: 0.74, environmental_quality: 0.66, localization_error_m: 2.4 },
      },
    },
    explanation: {
      B2: [
        SUPPORT("Strong person-associated RF evidence"),
        SUPPORT("Supporting GPR and seismic evidence"),
        SUPPORT("Three modalities spatially consistent"),
      ],
    },
  },

  GPR_NO_THERMAL: {
    label: "GPR active, thermal cleared/unavailable",
    sensors: { thermal: "UNAVAILABLE" },
    contextualPrior: "HIGH",
    temporalConsistency: 0.71,
    zones: {
      B2: { probability: 0.7, priority: "P2", action: "SECONDARY_SENSOR_SCAN", depth_m: 1.3, error_m: 1.2 },
      C3: { probability: 0.5, priority: "P2", action: "SECONDARY_SENSOR_SCAN", depth_m: 1.7, error_m: 1.7 },
      D4: { probability: 0.17, priority: "P3", action: "DEFER", depth_m: null, error_m: null },
    },
    evidence: {
      B2: {
        gpr: { evidence: 0.72, signal_quality: 0.86, environmental_quality: 0.82, estimated_depth_m: 1.3, localization_error_m: 0.8 },
      },
    },
    explanation: {
      B2: [
        SUPPORT("Moderate GPR evidence"),
        CAUTION("Thermal modality unavailable — not counted as zero evidence"),
        CAUTION("No person-associated RF evidence"),
      ],
    },
  },

  GPR_RF_NO_THERMAL: {
    label: "GPR + RF, thermal unavailable",
    sensors: { rf: "ACTIVE", thermal: "UNAVAILABLE" },
    contextualPrior: "HIGH",
    temporalConsistency: 0.86,
    zones: {
      B2: { probability: 0.9, priority: "P1", action: "PINPOINT_AND_PROBE", depth_m: 1.2, error_m: 0.7 },
      C3: { probability: 0.63, priority: "P2", action: "SECONDARY_SENSOR_SCAN", depth_m: 1.7, error_m: 1.5 },
    },
    evidence: {
      B2: {
        gpr: { evidence: 0.72, signal_quality: 0.86, environmental_quality: 0.82, estimated_depth_m: 1.3, localization_error_m: 0.8 },
        rf: { evidence: 0.94, signal_quality: 0.91, interference: 0.12, localization_error_m: 0.5 },
      },
    },
    explanation: {
      B2: [
        SUPPORT("Strong person-associated RF evidence"),
        SUPPORT("Supporting GPR evidence"),
        CAUTION("Thermal modality unavailable"),
      ],
    },
  },
};

// Deterministic scenario transitions for demo controls.
export const TRANSITIONS: Record<ScenarioId, Partial<Record<string, ScenarioId>>> = {
  T0_NO_EVIDENCE: { GPR_DETECTION: "BASE_GPR", RF_DETECTION: "CONTEXT_ONLY" },
  CONTEXT_ONLY: { GPR_DETECTION: "BASE_GPR" },
  BASE_GPR: {
    RF_DETECTION: "GPR_RF",
    DEGRADE_GPR: "GPR_DEGRADED",
    THERMAL_ANOMALY: "GPR_THERMAL_ANOMALY",
    CLEAR_THERMAL: "GPR_NO_THERMAL",
    SEISMIC_EVIDENCE: "GPR_SEISMIC",
  },
  GPR_RF: {
    REMOVE_RF: "BASE_GPR",
    DEGRADE_GPR: "GPR_DEGRADED_RF",
    THERMAL_ANOMALY: "GPR_RF_THERMAL",
    CLEAR_THERMAL: "GPR_RF_NO_THERMAL",
    SEISMIC_EVIDENCE: "GPR_RF_SEISMIC",
  },
  GPR_DEGRADED: {
    RF_DETECTION: "GPR_DEGRADED_RF",
    GPR_DETECTION: "BASE_GPR",
    THERMAL_ANOMALY: "GPR_THERMAL_ANOMALY",
    CLEAR_THERMAL: "GPR_NO_THERMAL",
    SEISMIC_EVIDENCE: "GPR_SEISMIC",
  },
  GPR_DEGRADED_RF: {
    REMOVE_RF: "GPR_DEGRADED",
    GPR_DETECTION: "GPR_RF",
    THERMAL_ANOMALY: "GPR_RF_THERMAL",
    SEISMIC_EVIDENCE: "GPR_RF_SEISMIC",
  },
  GPR_THERMAL_ANOMALY: {
    RF_DETECTION: "GPR_RF_THERMAL",
    CLEAR_THERMAL: "GPR_NO_THERMAL",
    DEGRADE_GPR: "GPR_DEGRADED",
    SEISMIC_EVIDENCE: "GPR_SEISMIC",
  },
  GPR_RF_THERMAL: {
    REMOVE_RF: "GPR_THERMAL_ANOMALY",
    CLEAR_THERMAL: "GPR_RF_NO_THERMAL",
    DEGRADE_GPR: "GPR_DEGRADED_RF",
    SEISMIC_EVIDENCE: "GPR_RF_SEISMIC",
  },
  GPR_SEISMIC: {
    RF_DETECTION: "GPR_RF_SEISMIC",
    DEGRADE_GPR: "GPR_DEGRADED",
    THERMAL_ANOMALY: "GPR_THERMAL_ANOMALY",
    CLEAR_THERMAL: "GPR_NO_THERMAL",
  },
  GPR_RF_SEISMIC: {
    REMOVE_RF: "GPR_SEISMIC",
    DEGRADE_GPR: "GPR_DEGRADED_RF",
    THERMAL_ANOMALY: "GPR_RF_THERMAL",
    CLEAR_THERMAL: "GPR_RF_NO_THERMAL",
  },
  GPR_NO_THERMAL: {
    RF_DETECTION: "GPR_RF_NO_THERMAL",
    THERMAL_ANOMALY: "GPR_THERMAL_ANOMALY",
    DEGRADE_GPR: "GPR_DEGRADED",
    SEISMIC_EVIDENCE: "GPR_SEISMIC",
  },
  GPR_RF_NO_THERMAL: {
    REMOVE_RF: "GPR_NO_THERMAL",
    THERMAL_ANOMALY: "GPR_RF_THERMAL",
    DEGRADE_GPR: "GPR_DEGRADED_RF",
    SEISMIC_EVIDENCE: "GPR_RF_SEISMIC",
  },
};

// Timeline fragments appended by each transition (deterministic clock).
export const ACTION_TIMELINE: Record<string, { source: string; event: string; description: string }[]> = {
  RESET_SCENARIO: [
    { source: "SYSTEM", event: "Scenario reset", description: "Synthetic sensor inputs restored to baseline" },
  ],
  GPR_DETECTION: [
    { source: "GPR", event: "Candidate detected", description: "Sub-surface candidate signature in cell B2" },
    { source: "FUSION", event: "Evidence updated", description: "Backend fusion result recomputed" },
  ],
  RF_DETECTION: [
    { source: "RF", event: "Signal detected", description: "457 kHz person-associated signal in cell B2" },
    { source: "FUSION", event: "Evidence updated", description: "Backend fusion result recomputed" },
    { source: "DECISION", event: "Zone B2 promoted P2 → P1", description: "Recommended action: PINPOINT → PROBE" },
  ],
  REMOVE_RF: [
    { source: "RF", event: "Signal lost", description: "457 kHz transceiver signal no longer received" },
    { source: "FUSION", event: "Evidence updated", description: "Backend fusion result recomputed" },
    { source: "DECISION", event: "Zone B2 downgraded P1 → P2", description: "Recommended action: SECONDARY SENSOR SCAN" },
  ],
  DEGRADE_GPR: [
    { source: "GPR", event: "Sensor degraded", description: "Signal quality 31%, environmental quality 27%" },
    { source: "FUSION", event: "Confidence reduced", description: "Backend withheld depth estimate" },
  ],
  THERMAL_ANOMALY: [
    { source: "THERMAL", event: "Anomaly reported", description: "Thermal anomaly 68% under poor visibility" },
    { source: "FUSION", event: "Anomaly down-weighted", description: "Low environmental quality applied by backend" },
  ],
  CLEAR_THERMAL: [
    { source: "THERMAL", event: "Modality unavailable", description: "Thermal feed cleared — reported as UNAVAILABLE, not 0%" },
  ],
  SEISMIC_EVIDENCE: [
    { source: "SEISMIC", event: "Transient detected", description: "Movement-consistent transient in geophone array" },
    { source: "FUSION", event: "Evidence updated", description: "Backend fusion result recomputed" },
  ],
};

export const BASE_TIMELINE: { timestamp: string; source: string; event: string; description: string }[] = [
  { timestamp: "10:29:41", source: "SYSTEM", event: "Incident declared", description: "INC-2026-001 opened" },
  { timestamp: "10:30:12", source: "CONTEXT", event: "Search context established", description: "Last-known position + flow model applied" },
  { timestamp: "10:31:02", source: "GPR", event: "Candidate detected", description: "Sub-surface candidate signature in cell B2" },
];

export const REPLAY_EVENTS: ReplayEvent[] = [
  { t: "00:00", seconds: 0, title: "Avalanche incident", source: "SYSTEM", description: "Incident declared. No search context, no sensor confirmation.", scenario: "T0_NO_EVIDENCE", contextEstablished: false },
  { t: "00:15", seconds: 15, title: "Search context established", source: "CONTEXT", description: "Last-known position, avalanche boundary and flow direction applied.", scenario: "CONTEXT_ONLY", contextEstablished: true },
  { t: "00:30", seconds: 30, title: "GPR evidence", source: "GPR", description: "Sub-surface candidate signature detected in cell B2.", scenario: "BASE_GPR", contextEstablished: true },
  { t: "00:42", seconds: 42, title: "RF evidence", source: "RF", description: "457 kHz person-associated signal received from cell B2.", scenario: "GPR_RF", contextEstablished: true },
  { t: "00:45", seconds: 45, title: "Fusion update", source: "FUSION", description: "Backend fusion result updated — victim probability 91%.", scenario: "GPR_RF", contextEstablished: true },
  { t: "00:46", seconds: 46, title: "Priority update", source: "DECISION", description: "Zone B2 promoted P2 → P1.", scenario: "GPR_RF", contextEstablished: true },
  { t: "00:50", seconds: 50, title: "PINPOINT → PROBE", source: "DECISION", description: "Recommended rescue action issued for zone B2.", scenario: "GPR_RF", contextEstablished: true },
];

export const RESCUER_POSITIONS = [
  { id: "TEAM-1", latitude: 34.1247, longitude: 77.4553, label: "Probe line" },
  { id: "TEAM-2", latitude: 34.1229, longitude: 77.4585, label: "Transceiver sweep" },
  { id: "UAV-1", latitude: 34.1239, longitude: 77.4576, label: "Thermal/RGB UAV" },
];

export const SENSOR_OBSERVATIONS = [
  { id: "OBS-GPR-1", sensor: "GPR", latitude: 34.12395, longitude: 77.45575, scenarios: ["BASE_GPR", "GPR_RF", "GPR_DEGRADED", "GPR_DEGRADED_RF", "GPR_THERMAL_ANOMALY", "GPR_RF_THERMAL", "GPR_SEISMIC", "GPR_RF_SEISMIC", "GPR_NO_THERMAL", "GPR_RF_NO_THERMAL"] },
  { id: "OBS-RF-1", sensor: "RF", latitude: 34.1239, longitude: 77.4559, scenarios: ["GPR_RF", "GPR_DEGRADED_RF", "GPR_RF_THERMAL", "GPR_RF_SEISMIC", "GPR_RF_NO_THERMAL"] },
  { id: "OBS-TH-1", sensor: "THERMAL", latitude: 34.12305, longitude: 77.4583, scenarios: ["GPR_THERMAL_ANOMALY", "GPR_RF_THERMAL"] },
  { id: "OBS-SE-1", sensor: "SEISMIC", latitude: 34.1236, longitude: 77.4565, scenarios: ["GPR_SEISMIC", "GPR_RF_SEISMIC"] },
];

export const ANALYTICS_DISCLAIMER =
  "These results are generated from controlled prototype scenarios and are intended to evaluate software behaviour. They do not represent field-validated avalanche rescue performance.";

export { BASELINE_PRIORS, prioritizedArea };

function prioritizedArea(count: number) {
  return count * CELL_AREA_M2;
}
