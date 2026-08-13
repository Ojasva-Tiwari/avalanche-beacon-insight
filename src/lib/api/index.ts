// Service abstraction. Components never call fetch directly.
// When VITE_USE_MOCK_API is "false" and VITE_API_URL is set, these services
// will call the Python/FastAPI backend instead of the deterministic mock.

import * as mock from "./mockBackend";
import type { DemoAction, ScenarioId } from "@/lib/types";

export const API_URL = (import.meta.env["VITE_API_URL"] as string | undefined) ?? "";
export const USE_MOCK_API =
  (import.meta.env["VITE_USE_MOCK_API"] as string | undefined) !== "false" || !API_URL;

const latency = <T>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), 90));

async function backend<T>(path: string, fallback: () => T): Promise<T> {
  if (USE_MOCK_API) return latency(fallback());
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) throw new Error(`BACKEND_OFFLINE:${res.status}`);
  return (await res.json()) as T;
}

export const incidentApi = {
  getIncident: () => backend("/incident", mock.getIncident),
  getEnvironment: () => backend("/incident/environment", mock.getEnvironment),
};

export const searchApi = {
  getSearchZones: (scenario: ScenarioId) =>
    backend(`/search/zones?scenario=${scenario}`, () => mock.getSearchZones(scenario)),
  getZoneDetails: (scenario: ScenarioId, zoneId: string) =>
    backend(`/search/zones/${zoneId}?scenario=${scenario}`, () =>
      mock.getZoneDetails(scenario, zoneId),
    ),
};

export const sensorApi = {
  getSensorStatus: (scenario: ScenarioId) =>
    backend(`/sensors?scenario=${scenario}`, () => mock.getSensorStatus(scenario)),
};

export const evidenceApi = {
  getEvidenceTimeline: () => backend("/evidence/timeline", mock.getBaseTimeline),
};

export const systemApi = {
  getSystemStatus: (scenario: ScenarioId, lastUpdate: string) =>
    backend(`/system/status`, () => mock.getSystemStatus(scenario, lastUpdate)),
};

export const replayApi = {
  getReplayEvents: () => backend("/replay/events", mock.getReplayEvents),
};

export const analyticsApi = {
  getAnalyticsMetrics: () => backend("/analytics/metrics", mock.getAnalyticsMetrics),
};

export const simulationApi = {
  simulateSensorEvent: (scenario: ScenarioId, action: DemoAction) =>
    latency({
      scenario: mock.nextScenario(scenario, action),
      events: (action: DemoAction, clock: string) => mock.timelineForAction(action, clock),
    }),
  nextScenario: mock.nextScenario,
  timelineForAction: mock.timelineForAction,
  resetSimulation: () => mock.initialScenario,
  initialScenario: mock.initialScenario,
  advance: mock.advance,
};
