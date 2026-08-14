import type {
  DecisionApiResponse,
  DecisionDataMode,
  DecisionProvenance,
  IncidentState,
  ScenarioId,
  SearchZone,
  SensorObservation,
  ZoneDetails,
} from "@/lib/types";
import { computeZoneDecision, type EngineZoneResult } from "../engine";
import { adaptObservationsToEvidence, validateObservation } from "./sensorAdapter";
import {
  ALL_ZONE_IDS,
  BASELINE_PRIORS,
  CONTEXT_PRIOR_ZONES,
  INCIDENT,
  IN_PATH_ZONES,
  SCENARIOS,
  cellCenter,
  resolveSensors,
} from "../mock/dataset";

export interface ReplayState {
  incidentId: string;
  observations: SensorObservation[];
  dataMode: DecisionDataMode;
  latestEvidenceTimestamp: string | null;
  zoneResults: Record<string, EngineZoneResult>; // zoneId -> EngineZoneResult
}

export class IncidentStoreManager {
  private incidents: Map<string, IncidentState> = new Map();
  private observationStreams: Map<string, SensorObservation[]> = new Map();
  private ingestedObsIds: Set<string> = new Set(); // Global observationId deduplication set
  private activeMode: DecisionDataMode = "SYNTHETIC";
  private networkConnected: boolean = true;

  constructor() {
    // Initialize default Incident INC-2026-001
    this.incidents.set("INC-2026-001", {
      incidentId: "INC-2026-001",
      locationName: INCIDENT.location_name,
      avalancheStatus: "ACTIVE",
      lastKnownPosition: INCIDENT.last_known_position,
      avalancheFlowBearingDeg: INCIDENT.avalanche_flow_bearing_deg,
      suspectedVictims: INCIDENT.suspected_victims,
      declaredAt: INCIDENT.declared_at,
      elevationM: INCIDENT.elevation_m,
      dataSource: "SIMULATED",
      activeScenarioId: "BASE_GPR",
    });
    this.observationStreams.set("INC-2026-001", []);
  }

  public setNetworkConnected(connected: boolean) {
    this.networkConnected = connected;
  }

  public setDataMode(mode: DecisionDataMode) {
    this.activeMode = mode;
  }

  public getDataMode(incidentId: string): DecisionDataMode {
    if (!this.networkConnected) {
      const stream = this.observationStreams.get(incidentId);
      if (stream && stream.length > 0) {
        return "OFFLINE_CACHED";
      }
      return "OFFLINE_NO_DATA";
    }
    return this.activeMode;
  }

  public getProvenance(
    incidentId: string,
    evidenceSource: string = "SYNTHETIC_SCENARIO_BASE_GPR",
  ): DecisionProvenance {
    const dataMode = this.getDataMode(incidentId);
    const stream = this.observationStreams.get(incidentId) ?? [];
    const latestObs = stream[stream.length - 1];

    return {
      dataMode,
      decisionTimestamp: new Date().toISOString(),
      latestEvidenceTimestamp: latestObs?.eventTimestamp ?? null,
      terrainSource: "COPERNICUS DEM GLO-30 (Tile N34E077)",
      evidenceSource,
      engineVersion: "1.3.0-PHASE2C-LOCKED",
    };
  }

  /**
   * Evaluates decision state for a search zone.
   * If compound zone ID is passed (e.g. "INC-2026-001:Z-01"), splits incidentId and zoneId.
   */
  public evaluateZone(
    incidentId: string,
    zoneId: string,
    scenarioId: ScenarioId = "BASE_GPR",
  ): EngineZoneResult {
    const actualZoneId = zoneId.includes(":") ? zoneId.split(":")[1]! : zoneId;
    const actualIncidentId = zoneId.includes(":") ? zoneId.split(":")[0]! : incidentId;

    const stream = this.observationStreams.get(actualIncidentId) ?? [];
    const zoneObs = stream.filter((o) => o.zoneId === actualZoneId);

    const scenario = SCENARIOS[scenarioId];
    const rawEvidences = scenario?.evidence[actualZoneId] ?? {};
    const prior = BASELINE_PRIORS[actualZoneId] ?? 0.02;
    const center = cellCenter(actualZoneId);

    const adaptedEvidences =
      zoneObs.length > 0 ? adaptObservationsToEvidence(zoneObs) : rawEvidences;
    const sensorStatuses = scenario ? resolveSensors(scenario) : [];

    // STRICT: Calls immutable locked core computeZoneDecision
    return computeZoneDecision({
      zoneId: actualZoneId,
      priorProbability: prior,
      latitude: center.latitude,
      longitude: center.longitude,
      evidences: adaptedEvidences,
      sensorStatuses,
      inAvalanchePath: IN_PATH_ZONES.has(actualZoneId),
      estimatedDepthM: 1.2,
      elapsedMinutes: 15,
    });
  }

  /**
   * Ingests sensor observations into an incident's event stream.
   * Implements Idempotent Deduplication by observationId and Out-of-Order Cascade Replay.
   */
  public ingestObservations(
    incidentId: string,
    observations: SensorObservation[],
  ): { ingestedCount: number; skippedCount: number } {
    let stream = this.observationStreams.get(incidentId);
    if (!stream) {
      stream = [];
      this.observationStreams.set(incidentId, stream);
    }

    let ingestedCount = 0;
    let skippedCount = 0;

    for (const obs of observations) {
      // Validate schema & check derived output write attempts
      const val = validateObservation(obs);
      if (!val.valid) {
        throw new Error(`${val.errorCode}: ${val.errorMessage}`);
      }

      // Idempotency: Skip duplicate observationId
      if (this.ingestedObsIds.has(obs.observationId)) {
        skippedCount++;
        continue;
      }

      this.ingestedObsIds.add(obs.observationId);
      stream.push(obs);
      ingestedCount++;
    }

    // Historical Event Cascade Replay: Sort stream strictly by eventTimestamp ascending
    stream.sort(
      (a, b) => new Date(a.eventTimestamp).getTime() - new Date(b.eventTimestamp).getTime(),
    );

    return { ingestedCount, skippedCount };
  }

  /**
   * Deterministically replays a complete historical event stream for an incident.
   */
  public replayIncident(
    incidentId: string,
    scenarioId: ScenarioId = "BASE_GPR",
  ): Record<string, EngineZoneResult> {
    const results: Record<string, EngineZoneResult> = {};
    for (const zoneId of ALL_ZONE_IDS) {
      results[zoneId] = this.evaluateZone(incidentId, zoneId, scenarioId);
    }
    return results;
  }
}

export const globalIncidentStore = new IncidentStoreManager();
