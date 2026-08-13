// Deterministic mock backend. Mirrors the response shape of the future
// Python/FastAPI service. No calculations happen in React components.

import {
  ACTION_TIMELINE,
  ALL_ZONE_IDS,
  ANALYTICS_DISCLAIMER,
  BASE_TIMELINE,
  CELL_AREA_M2,
  CONTEXT_PRIOR_ZONES,
  ENVIRONMENT,
  INCIDENT,
  IN_PATH_ZONES,
  REPLAY_EVENTS,
  SCENARIOS,
  SENSOR_META,
  TRANSITIONS,
  cellCenter,
  resolveSensors,
} from "@/lib/mock/dataset";
import type {
  AnalyticsMetrics,
  DemoAction,
  EvidenceEvent,
  ScenarioId,
  SearchZone,
  SensorEvidence,
  SensorId,
  SensorStatus,
  SystemStatus,
  ZoneDetails,
} from "@/lib/types";

const FALLBACK_OUTPUT = {
  probability: null,
  priority: null,
  action: "INSUFFICIENT_EVIDENCE" as const,
  depth_m: null,
  error_m: null,
};

export const initialScenario: ScenarioId = "BASE_GPR";

export function nextScenario(current: ScenarioId, action: DemoAction): ScenarioId {
  if (action === "RESET_SCENARIO") return initialScenario;
  return TRANSITIONS[current]?.[action] ?? current;
}

export function timelineForAction(action: DemoAction, clock: string): EvidenceEvent[] {
  return (ACTION_TIMELINE[action] ?? []).map((e, i) => ({
    timestamp: advance(clock, i + 1),
    source: e.source,
    event: e.event,
    description: e.description,
  }));
}

/** Deterministic clock arithmetic — adds `secs` seconds to a hh:mm:ss string. */
export function advance(clock: string, secs: number) {
  const parts = clock.split(":").map(Number);
  const total = (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0) + secs;
  const hh = Math.floor(total / 3600) % 24;
  const mm = Math.floor((total % 3600) / 60);
  const ss = total % 60;
  return [hh, mm, ss].map((n) => String(n).padStart(2, "0")).join(":");
}

export function getIncident() {
  return INCIDENT;
}

export function getEnvironment() {
  return ENVIRONMENT;
}

export function getSensorStatus(scenarioId: ScenarioId): SensorStatus[] {
  return resolveSensors(SCENARIOS[scenarioId]);
}

export function getSearchZones(scenarioId: ScenarioId): SearchZone[] {
  const scenario = SCENARIOS[scenarioId];
  return ALL_ZONE_IDS.map((id) => {
    const out = scenario.zones[id] ?? CONTEXT_PRIOR_ZONES[id] ?? FALLBACK_OUTPUT;
    const { latitude, longitude } = cellCenter(id);
    return {
      zone_id: id,
      latitude,
      longitude,
      victim_probability: out.probability,
      priority: out.priority,
      estimated_depth_m: out.depth_m,
      localization_error_m: out.error_m,
      recommended_action: out.action,
      in_avalanche_path: IN_PATH_ZONES.has(id),
    };
  });
}

const ALT_ACTIONS = ["SECONDARY_SENSOR_SCAN", "REMOTE_SENSING", "DEFER"] as const;

export function getZoneDetails(scenarioId: ScenarioId, zoneId: string): ZoneDetails {
  const scenario = SCENARIOS[scenarioId];
  const out = scenario.zones[zoneId] ?? CONTEXT_PRIOR_ZONES[zoneId] ?? FALLBACK_OUTPUT;
  const center = cellCenter(zoneId);
  const sensors = getSensorStatus(scenarioId);
  const rawEvidence = scenario.evidence[zoneId] ?? {};

  const evidence: SensorEvidence[] = SENSOR_META.filter(
    (m) => rawEvidence[m.id] || ["gpr", "rf", "thermal", "seismic"].includes(m.id),
  ).map((meta) => {
    const e = rawEvidence[meta.id];
    const state = sensors.find((s) => s.id === meta.id)?.state ?? "UNAVAILABLE";
    return {
      sensor_id: meta.id as SensorId,
      label: meta.short_label,
      evidence: e?.evidence ?? null,
      signal_quality: e?.signal_quality ?? null,
      environmental_quality: e?.environmental_quality ?? null,
      interference: e?.interference ?? null,
      visibility: e?.visibility ?? null,
      estimated_depth_m: e?.estimated_depth_m ?? null,
      localization_error_m: e?.localization_error_m ?? null,
      state,
    };
  });

  return {
    zone: zoneId,
    victim_probability: out.probability,
    priority: out.priority,
    recommended_action: out.action,
    alternative_actions: ALT_ACTIONS.filter((a) => a !== out.action),
    location: { latitude: center.latitude, longitude: center.longitude, error_m: out.error_m },
    estimated_depth_m: out.depth_m,
    contextual_prior: IN_PATH_ZONES.has(zoneId) ? scenario.contextualPrior : "LOW",
    temporal_consistency: scenario.temporalConsistency,
    evidence,
    explanation:
      scenario.explanation[zoneId] ??
      (out.probability === null
        ? [{ kind: "CAUTION", text: "No current evidence for this cell" }]
        : [
            { kind: "SUPPORT", text: "Cell scored from contextual prior (avalanche flow model)" },
            { kind: "CAUTION", text: "No confirming sensor evidence in this cell" },
          ]),
    status_note: scenario.statusNote ?? null,
  };
}

export function getSystemStatus(scenarioId: ScenarioId, lastUpdate: string): SystemStatus {
  const sensors = getSensorStatus(scenarioId);
  const anyActive = sensors.some((s) => s.state === "ACTIVE");
  return {
    backend: "ONLINE",
    database: "ONLINE",
    fusion_engine: "READY",
    websocket: "CONNECTED",
    sensor_stream: anyActive ? "ACTIVE" : "IDLE",
    last_update: lastUpdate,
    mode: "DEMO",
  };
}

export function getBaseTimeline(): EvidenceEvent[] {
  return BASE_TIMELINE.map((e) => ({ ...e }));
}

export function getReplayEvents() {
  return REPLAY_EVENTS;
}

export function getAnalyticsMetrics(): AnalyticsMetrics {
  const prioritized = 8 * CELL_AREA_M2;
  const initial = ALL_ZONE_IDS.length * CELL_AREA_M2;
  return {
    search_area: {
      initial_m2: 10000,
      prioritized_m2: 3500,
      reduction_pct: 65,
    },
    localization: {
      top1_success_pct: 78,
      top3_recall_pct: 94,
      mean_error_m: 1.4,
      median_error_m: 0.9,
      max_error_m: 4.2,
    },
    robustness: [
      { condition: "All sensors available", p1_count: 2, p2_count: 4, p3_count: 18, localization_error_m: 0.6, search_area_m2: 2900, confidence: 0.94, note: null },
      { condition: "RF unavailable", p1_count: 0, p2_count: 5, p3_count: 19, localization_error_m: 1.1, search_area_m2: 4400, confidence: 0.72, note: "No person-associated evidence" },
      { condition: "GPR degraded", p1_count: 0, p2_count: 1, p3_count: 23, localization_error_m: 3.4, search_area_m2: 6800, confidence: 0.46, note: "Depth estimate withheld" },
      { condition: "Thermal degraded", p1_count: 1, p2_count: 4, p3_count: 19, localization_error_m: 1.1, search_area_m2: 3500, confidence: 0.74, note: null },
      { condition: "RF + GPR unavailable", p1_count: 0, p2_count: 0, p3_count: 0, localization_error_m: null, search_area_m2: initial, confidence: null, note: "INSUFFICIENT EVIDENCE" },
    ],
    priority_progression: [
      { stage: "Initial", priority: "P3", label: "No evidence" },
      { stage: "Context", priority: "P2", label: "Flow-line prior" },
      { stage: "GPR", priority: "P2", label: "Sub-surface candidate" },
      { stage: "RF", priority: "P1", label: "Person-associated signal" },
      { stage: "Final", priority: "P1", label: "PINPOINT → PROBE" },
    ],
    scenarios: [
      { scenario: "S1 — Full sensor suite", sensor_condition: "GPR + RF + Thermal", ground_truth_zone: "B2", top_predicted_zone: "B2", top3_contains_victim: true, localization_error_m: 0.6, p1_generated: true, recommended_action: "PINPOINT_AND_PROBE" },
      { scenario: "S2 — RF unavailable", sensor_condition: "GPR + Thermal (degraded)", ground_truth_zone: "B2", top_predicted_zone: "B2", top3_contains_victim: true, localization_error_m: 1.1, p1_generated: false, recommended_action: "SECONDARY_SENSOR_SCAN" },
      { scenario: "S3 — GPR degraded", sensor_condition: "GPR degraded, no RF", ground_truth_zone: "B2", top_predicted_zone: "B2", top3_contains_victim: true, localization_error_m: 3.4, p1_generated: false, recommended_action: "REMOTE_SENSING" },
      { scenario: "S4 — Thermal anomaly, poor visibility", sensor_condition: "GPR + Thermal anomaly", ground_truth_zone: "B2", top_predicted_zone: "B2", top3_contains_victim: true, localization_error_m: 1.1, p1_generated: false, recommended_action: "SECONDARY_SENSOR_SCAN" },
      { scenario: "S5 — Displaced victim", sensor_condition: "GPR + RF + Seismic", ground_truth_zone: "C3", top_predicted_zone: "C3", top3_contains_victim: true, localization_error_m: 1.5, p1_generated: true, recommended_action: "PINPOINT_AND_PROBE" },
      { scenario: "S6 — Sensor blackout", sensor_condition: "RF + GPR unavailable", ground_truth_zone: "B2", top_predicted_zone: "—", top3_contains_victim: false, localization_error_m: null, p1_generated: false, recommended_action: "INSUFFICIENT_EVIDENCE" },
    ],
  };
}

export { ANALYTICS_DISCLAIMER, prioritizedArea };

function prioritizedArea(count: number) {
  return count * CELL_AREA_M2;
}
