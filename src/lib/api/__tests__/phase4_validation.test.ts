import { describe, expect, test } from "bun:test";
import { globalIncidentStore, IncidentStoreManager } from "../incidentStore";
import { validateObservation } from "../sensorAdapter";
import { searchApi, incidentApi } from "../index";
import { computeZoneDecision, calculateSlopeHazardRisk, logOddsToProbability } from "../../engine";
import type { SensorObservation } from "@/lib/types";

describe("Phase 4 — Deterministic Operational Scenario Validation Suite", () => {
  const now = Date.now();
  const t1 = new Date(now - 1000000).toISOString();
  const t2 = new Date(now - 800000).toISOString();
  const t3 = new Date(now - 600000).toISOString();
  const t4 = new Date(now - 400000).toISOString();
  const t5 = new Date(now - 200000).toISOString();

  // =========================================================================
  // SCENARIO A: Deterministic Multi-Zone Synthetic Incident Scenarios
  // =========================================================================
  test("Scenario A: Deterministic multi-zone grid evaluation ranks zones by utility", () => {
    const store = new IncidentStoreManager();

    // Ingest multi-sensor observations for Z-01
    store.ingestObservations("INC-PHASE4-A", [
      {
        observationId: "OBS-ZA-RF",
        incidentId: "INC-PHASE4-A",
        zoneId: "Z-01",
        sensorId: "rf_01",
        sensorType: "RF",
        eventTimestamp: t1,
        ingestionTimestamp: t1,
        measurement: 0.85,
        confidence: 0.9,
        environmentalQuality: 0.9,
        interference: 0.1,
      },
      {
        observationId: "OBS-ZA-GPR",
        incidentId: "INC-PHASE4-A",
        zoneId: "Z-01",
        sensorId: "gpr_01",
        sensorType: "GPR",
        eventTimestamp: t2,
        ingestionTimestamp: t2,
        measurement: 0.75,
        confidence: 0.85,
        environmentalQuality: 0.9,
        interference: 0.1,
      },
    ]);

    const resZ1 = store.evaluateZone("INC-PHASE4-A", "Z-01");
    const resZ4 = store.evaluateZone("INC-PHASE4-A", "Z-04");

    expect(resZ1.bayesian.probability).toBeGreaterThan(resZ4.bayesian.probability);
    expect(resZ1.utility.utilityScore).toBeGreaterThan(resZ4.utility.utilityScore);
    expect(resZ1.priority).toBeDefined();
  });

  // =========================================================================
  // SCENARIO B: Chronological and Out-of-Order Evidence Replay Equivalence
  // =========================================================================
  test("Scenario B: 5-observation stream produces 100% identical outputs for out-of-order arrival", () => {
    const storeChronological = new IncidentStoreManager();
    const storeScrambled = new IncidentStoreManager();

    const o1: SensorObservation = {
      observationId: "OBS-B1",
      incidentId: "INC-B",
      zoneId: "Z-01",
      sensorId: "rf_01",
      sensorType: "RF",
      eventTimestamp: t1,
      ingestionTimestamp: t1,
      measurement: 0.8,
      confidence: 0.9,
      environmentalQuality: 0.9,
      interference: 0.1,
    };
    const o2: SensorObservation = {
      observationId: "OBS-B2",
      incidentId: "INC-B",
      zoneId: "Z-01",
      sensorId: "gpr_01",
      sensorType: "GPR",
      eventTimestamp: t2,
      ingestionTimestamp: t2,
      measurement: 0.7,
      confidence: 0.85,
      environmentalQuality: 0.9,
      interference: 0.1,
    };
    const o3: SensorObservation = {
      observationId: "OBS-B3",
      incidentId: "INC-B",
      zoneId: "Z-01",
      sensorId: "thermal_01",
      sensorType: "THERMAL",
      eventTimestamp: t3,
      ingestionTimestamp: t3,
      measurement: 0.6,
      confidence: 0.8,
      environmentalQuality: 0.85,
      interference: 0.15,
    };
    const o4: SensorObservation = {
      observationId: "OBS-B4",
      incidentId: "INC-B",
      zoneId: "Z-01",
      sensorId: "seismic_01",
      sensorType: "SEISMIC",
      eventTimestamp: t4,
      ingestionTimestamp: t4,
      measurement: 0.5,
      confidence: 0.75,
      environmentalQuality: 0.8,
      interference: 0.2,
    };
    const o5: SensorObservation = {
      observationId: "OBS-B5",
      incidentId: "INC-B",
      zoneId: "Z-01",
      sensorId: "rgb_01",
      sensorType: "RGB",
      eventTimestamp: t5,
      ingestionTimestamp: t5,
      measurement: 0.4,
      confidence: 0.7,
      environmentalQuality: 0.8,
      interference: 0.2,
    };

    // Store 1: Chronological [O1, O2, O3, O4, O5]
    storeChronological.ingestObservations("INC-B", [o1, o2, o3, o4, o5]);
    const resChrono = storeChronological.evaluateZone("INC-B", "Z-01");

    // Store 2: Scrambled Arrival [O1, O5, O2, O4, O3]
    storeScrambled.ingestObservations("INC-B", [o1, o5, o2, o4, o3]);
    const resScrambled = storeScrambled.evaluateZone("INC-B", "Z-01");

    expect(resChrono.bayesian.probability).toBe(resScrambled.bayesian.probability);
    expect(resChrono.utility.utilityScore).toBe(resScrambled.utility.utilityScore);
    expect(resChrono.survivalFactor).toBe(resScrambled.survivalFactor);
    expect(resChrono.priority).toBe(resScrambled.priority);
  });

  // =========================================================================
  // SCENARIO C: Duplicate Observation Idempotency
  // =========================================================================
  test("Scenario C: Submitting duplicate observation 5 times skips 4 times with zero double counting", () => {
    const store = new IncidentStoreManager();
    const obs: SensorObservation = {
      observationId: "OBS-IDEM-99",
      incidentId: "INC-C",
      zoneId: "Z-01",
      sensorId: "rf_01",
      sensorType: "RF",
      eventTimestamp: t1,
      ingestionTimestamp: t1,
      measurement: 0.8,
      confidence: 0.9,
      environmentalQuality: 0.9,
      interference: 0.1,
    };

    // Submit 5 times
    const r1 = store.ingestObservations("INC-C", [obs, obs, obs, obs, obs]);
    expect(r1.ingestedCount).toBe(1);
    expect(r1.skippedCount).toBe(4);

    const prob1 = store.evaluateZone("INC-C", "Z-01").bayesian.probability;

    // Submit again
    const r2 = store.ingestObservations("INC-C", [obs]);
    expect(r2.ingestedCount).toBe(0);
    expect(r2.skippedCount).toBe(1);

    const prob2 = store.evaluateZone("INC-C", "Z-01").bayesian.probability;
    expect(prob1).toBe(prob2);
  });

  // =========================================================================
  // SCENARIO D: Missing, Malformed, Stale, and Invalid Observations
  // =========================================================================
  test("Scenario D: Corrupt and out-of-bounds payloads are rejected with explicit HTTP 400 error codes", () => {
    const baseObs = {
      observationId: "OBS-D-CORRUPT",
      sensorId: "rf_01",
      zoneId: "Z-01",
      eventTimestamp: t1,
    };

    expect(validateObservation({ ...baseObs, confidence: -0.5 }).errorCode).toBe("CONFIDENCE_OUT_OF_BOUNDS");
    expect(validateObservation({ ...baseObs, interference: NaN }).errorCode).toBe("INTERFERENCE_OUT_OF_BOUNDS");
    expect(validateObservation({ ...baseObs, measurement: 1.5 }).errorCode).toBe("MEASUREMENT_OUT_OF_BOUNDS");
    expect(validateObservation({ ...baseObs, eventTimestamp: undefined }).errorCode).toBe("MISSING_TIMESTAMP");

    const futureTs = new Date(Date.now() + 600000).toISOString();
    expect(validateObservation({ ...baseObs, eventTimestamp: futureTs }).errorCode).toBe("TIMESTAMP_FUTURE_CLOCK_SKEW");
  });

  // =========================================================================
  // SCENARIO E: Multi-Instance Same-Modality Collision Handling
  // =========================================================================
  test("Scenario E: Multi-instance same-modality collision throws MULTI_INSTANCE_FUSION_UNSPECIFIED", () => {
    const store = new IncidentStoreManager();

    const o1: SensorObservation = {
      observationId: "OBS-E1",
      incidentId: "INC-E",
      zoneId: "Z-01",
      sensorId: "rf_uav_alpha_01",
      sensorType: "RF",
      eventTimestamp: t1,
      ingestionTimestamp: t1,
      measurement: 0.8,
      confidence: 0.9,
      environmentalQuality: 0.9,
      interference: 0.1,
    };
    const o2: SensorObservation = {
      observationId: "OBS-E2",
      incidentId: "INC-E",
      zoneId: "Z-01",
      sensorId: "rf_ground_unit_02",
      sensorType: "RF",
      eventTimestamp: t2,
      ingestionTimestamp: t2,
      measurement: 0.85,
      confidence: 0.95,
      environmentalQuality: 0.9,
      interference: 0.05,
    };

    store.ingestObservations("INC-E", [o1, o2]);

    expect(() => store.evaluateZone("INC-E", "Z-01")).toThrow("MULTI_INSTANCE_FUSION_UNSPECIFIED");
  });

  // =========================================================================
  // SCENARIO F: Temporal Evolution of Zone Ranking
  // =========================================================================
  test("Scenario F: Survival factor decays monotonically over time down to baseline floor 0.03", () => {
    const res15 = computeZoneDecision({ zoneId: "Z-01", priorProbability: 0.2, elapsedMinutes: 15 });
    const res25 = computeZoneDecision({ zoneId: "Z-01", priorProbability: 0.2, elapsedMinutes: 25 });
    const res60 = computeZoneDecision({ zoneId: "Z-01", priorProbability: 0.2, elapsedMinutes: 60 });
    const res150 = computeZoneDecision({ zoneId: "Z-01", priorProbability: 0.2, elapsedMinutes: 150 });

    expect(res15.survivalFactor).toBe(0.92);
    expect(res25.survivalFactor).toBeLessThan(0.92);
    expect(res60.survivalFactor).toBeLessThan(res25.survivalFactor);
    expect(res150.survivalFactor).toBe(0.03); // Floor
  });

  // =========================================================================
  // SCENARIO G: Terrain-Aware Ranking Behavior
  // =========================================================================
  test("Scenario G: Slope hazard risk R_hazard cost penalty attenuates utility on steep/cliff zones", () => {
    const rFlat = calculateSlopeHazardRisk(10.0);
    const rMod = calculateSlopeHazardRisk(34.2);
    const rSteep = calculateSlopeHazardRisk(45.0);
    const rCliff = calculateSlopeHazardRisk(50.0);

    expect(rFlat).toBe(1.0);
    expect(rMod).toBeCloseTo(1.3487, 3);
    expect(rSteep).toBeCloseTo(2.4461, 3);
    expect(rCliff).toBe(2.0);

    const resFlat = computeZoneDecision({ zoneId: "Z-01", priorProbability: 0.2, slopeAngleDegrees: 10 });
    const resMod = computeZoneDecision({ zoneId: "Z-01", priorProbability: 0.2, slopeAngleDegrees: 34.2 });
    const resSteep = computeZoneDecision({ zoneId: "Z-01", priorProbability: 0.2, slopeAngleDegrees: 45.0 });

    expect(resFlat.utility.utilityScore).toBeGreaterThan(resMod.utility.utilityScore);
    expect(resMod.utility.utilityScore).toBeGreaterThan(resSteep.utility.utilityScore);
  });

  // =========================================================================
  // SCENARIO H: Backend Decision API Contract and Provenance
  // =========================================================================
  test("Scenario H: API response attaches mandatory DecisionProvenance metadata", async () => {
    const response = await searchApi.getSearchZonesWithProvenance("BASE_GPR", "INC-2026-001");
    expect(response.provenance).toBeDefined();
    expect(response.provenance.engineVersion).toContain("LOCKED");
    expect(response.provenance.terrainSource).toContain("COPERNICUS DEM GLO-30");
    expect(response.data).toBeArray();
  });

  // =========================================================================
  // SCENARIO I: Offline/Cache Failure Semantics
  // =========================================================================
  test("Scenario I: Offline semantics strictly distinguish OFFLINE_CACHED from OFFLINE_NO_DATA", () => {
    const store = new IncidentStoreManager();
    store.setNetworkConnected(false);

    expect(store.getDataMode("INC-EMPTY")).toBe("OFFLINE_NO_DATA");

    store.ingestObservations("INC-CACHED-I", [
      {
        observationId: "OBS-I1",
        incidentId: "INC-CACHED-I",
        zoneId: "Z-01",
        sensorId: "rf_01",
        sensorType: "RF",
        eventTimestamp: t1,
        ingestionTimestamp: t1,
        measurement: 0.8,
        confidence: 0.9,
        environmentalQuality: 0.9,
        interference: 0.1,
      },
    ]);

    expect(store.getDataMode("INC-CACHED-I")).toBe("OFFLINE_CACHED");
  });

  // =========================================================================
  // SCENARIO J: End-to-End Consistency (Backend to Frontend)
  // =========================================================================
  test("Scenario J: Search API details match direct engine evaluation outputs", async () => {
    const details = await searchApi.getZoneDetails("BASE_GPR", "Z-01", "INC-2026-001");
    const engineRes = globalIncidentStore.evaluateZone("INC-2026-001", "Z-01", "BASE_GPR");

    expect(details.victim_probability).toBe(engineRes.bayesian.probability);
    expect(details.priority).toBe(engineRes.priority);
  });

  // =========================================================================
  // SCENARIO K: Independent Analytical Reference Validation
  // =========================================================================
  test("Scenario K: Analytical Bayesian log-odds update matches sigmoid probability formula", () => {
    const res = computeZoneDecision({
      zoneId: "Z-01",
      priorProbability: 0.45,
      evidences: { rf: { state: "ACTIVE", evidence: 0.8, signal_quality: 0.9, environmental_quality: 0.9, interference: 0.1 } },
    });

    const expectedProb = logOddsToProbability(res.bayesian.logOdds);
    expect(res.bayesian.probability).toBeCloseTo(expectedProb, 6);
  });

  // =========================================================================
  // SCENARIO L: Explicit Separation between SYNTHETIC data and real sensor data
  // =========================================================================
  test("Scenario L: Provenance explicitly flags dataMode as SYNTHETIC for demo dataset", async () => {
    const res = await incidentApi.getIncidentWithProvenance("INC-2026-001");
    expect(res.provenance.dataMode).toBe("SYNTHETIC");
    expect(res.data.dataSource).toBe("SIMULATED");
  });
});
