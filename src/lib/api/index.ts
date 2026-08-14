import * as mock from "./mockBackend";
import { globalIncidentStore } from "./incidentStore";
import { validateObservation } from "./sensorAdapter";
import type {
  DecisionApiResponse,
  DemoAction,
  Incident,
  IncidentState,
  ScenarioId,
  SearchZone,
  SensorObservation,
  ZoneDetails,
} from "@/lib/types";

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
  getIncident: (incidentId: string = "INC-2026-001"): Promise<Incident> =>
    backend(`/api/incidents/${incidentId}`, () => mock.getIncident()),

  getIncidentWithProvenance: (
    incidentId: string = "INC-2026-001",
  ): Promise<DecisionApiResponse<IncidentState>> =>
    backend(`/api/incidents/${incidentId}`, () => {
      const inc = mock.getIncident();
      const state: IncidentState = {
        incidentId: inc.incident_id,
        locationName: inc.location_name,
        avalancheStatus: "ACTIVE",
        lastKnownPosition: inc.last_known_position,
        avalancheFlowBearingDeg: inc.avalanche_flow_bearing_deg,
        suspectedVictims: inc.suspected_victims,
        declaredAt: inc.declared_at,
        elevationM: inc.elevation_m,
        dataSource: "SIMULATED",
        activeScenarioId: "BASE_GPR",
      };
      return {
        provenance: globalIncidentStore.getProvenance(incidentId, "SYNTHETIC_INCIDENT_STORE"),
        data: state,
      };
    }),

  getEnvironment: () => backend("/incident/environment", mock.getEnvironment),

  postObservations: (
    incidentId: string,
    observations: SensorObservation[],
  ): Promise<DecisionApiResponse<{ ingestedCount: number; skippedCount: number }>> => {
    // Validate each observation before ingestion
    for (const obs of observations) {
      const val = validateObservation(obs);
      if (!val.valid) {
        return Promise.reject(new Error(`${val.errorCode}: ${val.errorMessage}`));
      }
    }

    const result = globalIncidentStore.ingestObservations(incidentId, observations);
    return latency({
      provenance: globalIncidentStore.getProvenance(incidentId, "LIVE_SENSOR_OBSERVATION_INGEST"),
      data: result,
    });
  },
};

export const searchApi = {
  getSearchZones: (
    scenario: ScenarioId = "BASE_GPR",
    incidentId: string = "INC-2026-001",
  ): Promise<SearchZone[]> =>
    backend(`/api/incidents/${incidentId}/zones?scenario=${scenario}`, () => {
      const rawZones = mock.getSearchZones(scenario);
      // Strictly bind victim_probability and priority to engine outputs
      return rawZones.map((z) => {
        const engineRes = globalIncidentStore.evaluateZone(incidentId, z.zone_id, scenario);
        return {
          ...z,
          victim_probability: engineRes.bayesian.probability,
          priority: engineRes.priority,
          recommended_action: engineRes.recommendedAction,
        };
      });
    }),

  getSearchZonesWithProvenance: (
    scenario: ScenarioId = "BASE_GPR",
    incidentId: string = "INC-2026-001",
  ): Promise<DecisionApiResponse<SearchZone[]>> =>
    backend(`/api/incidents/${incidentId}/zones?scenario=${scenario}`, () => {
      const zones = mock.getSearchZones(scenario).map((z) => {
        const engineRes = globalIncidentStore.evaluateZone(incidentId, z.zone_id, scenario);
        return {
          ...z,
          victim_probability: engineRes.bayesian.probability,
          priority: engineRes.priority,
          recommended_action: engineRes.recommendedAction,
        };
      });

      return {
        provenance: globalIncidentStore.getProvenance(
          incidentId,
          `SYNTHETIC_SCENARIO_${scenario}`,
        ),
        data: zones,
      };
    }),

  getZoneDetails: (
    scenario: ScenarioId,
    zoneId: string,
    incidentId: string = "INC-2026-001",
  ): Promise<ZoneDetails> =>
    backend(`/api/zones/${zoneId}?scenario=${scenario}`, () => {
      const details = mock.getZoneDetails(scenario, zoneId);
      const engineRes = globalIncidentStore.evaluateZone(incidentId, zoneId, scenario);

      return {
        ...details,
        victim_probability: engineRes.bayesian.probability,
        priority: engineRes.priority,
        recommended_action: engineRes.recommendedAction,
        terrain_features: engineRes.terrainFeatures,
      };
    }),

  getZoneDetailsWithProvenance: (
    scenario: ScenarioId,
    zoneId: string,
    incidentId: string = "INC-2026-001",
  ): Promise<DecisionApiResponse<ZoneDetails>> =>
    backend(`/api/zones/${zoneId}?scenario=${scenario}`, () => {
      const details = mock.getZoneDetails(scenario, zoneId);
      const engineRes = globalIncidentStore.evaluateZone(incidentId, zoneId, scenario);

      return {
        provenance: globalIncidentStore.getProvenance(
          incidentId,
          `SYNTHETIC_SCENARIO_${scenario}`,
        ),
        data: {
          ...details,
          victim_probability: engineRes.bayesian.probability,
          priority: engineRes.priority,
          recommended_action: engineRes.recommendedAction,
          terrain_features: engineRes.terrainFeatures,
        },
      };
    }),

  getZoneTerrain: (
    zoneId: string,
    incidentId: string = "INC-2026-001",
  ): Promise<DecisionApiResponse<any>> =>
    backend(`/api/zones/${zoneId}/terrain`, () => {
      const engineRes = globalIncidentStore.evaluateZone(incidentId, zoneId, "BASE_GPR");
      return {
        provenance: globalIncidentStore.getProvenance(incidentId, "COPERNICUS_DEM_GLO30"),
        data: engineRes.terrainFeatures,
      };
    }),
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
