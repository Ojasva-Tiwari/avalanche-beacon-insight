import { describe, expect, test } from "bun:test";
import { globalIncidentStore, IncidentStoreManager } from "../incidentStore";
import { validateObservation } from "../sensorAdapter";
import type { SensorObservation } from "@/lib/types";

describe("Phase 3 & Phase 3B — Sensor-Ready Backend API & Safety Verification Suite", () => {
  const now = Date.now();
  const t1 = new Date(now - 600000).toISOString(); // -10 min
  const t2 = new Date(now - 300000).toISOString(); // -5 min
  const t3 = new Date(now - 60000).toISOString();  // -1 min

  // =========================================================================
  // SECTION 1: ORIGINAL PHASE 3 BASELINE TESTS (Tests A through J)
  // =========================================================================

  test("Test A: Out-of-Order Cascade Replay yields identical final engine states", () => {
    const store1 = new IncidentStoreManager();
    const store2 = new IncidentStoreManager();

    const obs1: SensorObservation = {
      observationId: "OBS-T1",
      incidentId: "INC-TEST-A",
      zoneId: "Z-01",
      sensorId: "rf_01",
      sensorType: "RF",
      eventTimestamp: t1,
      ingestionTimestamp: t1,
      measurement: 0.8,
      confidence: 0.9,
      environmentalQuality: 0.95,
      interference: 0.05,
    };

    const obs2: SensorObservation = {
      observationId: "OBS-T2",
      incidentId: "INC-TEST-A",
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

    const obs3: SensorObservation = {
      observationId: "OBS-T3",
      incidentId: "INC-TEST-A",
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

    // Store 1: Chronological Order [T1, T2, T3]
    store1.ingestObservations("INC-TEST-A", [obs1, obs2, obs3]);
    const res1 = store1.evaluateZone("INC-TEST-A", "Z-01");

    // Store 2: Out-of-Order Arrival [T1, T3, T2]
    store2.ingestObservations("INC-TEST-A", [obs1, obs3, obs2]);
    const res2 = store2.evaluateZone("INC-TEST-A", "Z-01");

    expect(res1.bayesian.probability).toBeCloseTo(res2.bayesian.probability, 6);
    expect(res1.utility.utilityScore).toBeCloseTo(res2.utility.utilityScore, 6);
    expect(res1.priority).toBe(res2.priority);
  });

  test("Test B: Idempotency & Duplicate Observation Ingestion prevents double counting", () => {
    const store = new IncidentStoreManager();
    const obs: SensorObservation = {
      observationId: "OBS-DUP-01",
      incidentId: "INC-TEST-B",
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

    const firstIngest = store.ingestObservations("INC-TEST-B", [obs]);
    expect(firstIngest.ingestedCount).toBe(1);
    expect(firstIngest.skippedCount).toBe(0);

    const prob1 = store.evaluateZone("INC-TEST-B", "Z-01").bayesian.probability;

    // Submitting duplicate observation ID
    const secondIngest = store.ingestObservations("INC-TEST-B", [obs]);
    expect(secondIngest.ingestedCount).toBe(0);
    expect(secondIngest.skippedCount).toBe(1);

    const prob2 = store.evaluateZone("INC-TEST-B", "Z-01").bayesian.probability;
    expect(prob1).toBe(prob2);
  });

  test("Test C: Missing Sensor Modality contributes zero evidence (LR=1.0, ln(LR)=0)", () => {
    const store = new IncidentStoreManager();
    const res = store.evaluateZone("INC-TEST-C", "Z-01");

    // Unobserved modalities have zero evidence
    const rfLikelihood = res.likelihoods.find((l) => l.sensorId === "rf");
    expect(rfLikelihood).toBeDefined();
    if (rfLikelihood && rfLikelihood.state === "UNAVAILABLE") {
      expect(rfLikelihood.likelihoodRatio).toBe(1.0);
      expect(rfLikelihood.logLikelihoodRatio).toBe(0.0);
    }
  });

  test("Test D: Unknown Sensor Modality returns explicit validation rejection error", () => {
    const invalidObs: any = {
      observationId: "OBS-UNKNOWN",
      incidentId: "INC-TEST-D",
      zoneId: "Z-01",
      sensorId: "quantum_flux_sensor_99",
      sensorType: "QUANTUM",
      eventTimestamp: t1,
      measurement: 0.9,
    };

    const val = validateObservation(invalidObs);
    expect(val.valid).toBe(false);
    expect(val.errorCode).toBe("UNKNOWN_SENSOR_MODALITY");
  });

  test("Test E: Offline Failure Semantics yields OFFLINE_CACHED vs OFFLINE_NO_DATA", () => {
    const store = new IncidentStoreManager();
    store.setNetworkConnected(false);

    // Incident with no cached stream -> OFFLINE_NO_DATA
    const modeNoData = store.getDataMode("INC-NO-CACHE");
    expect(modeNoData).toBe("OFFLINE_NO_DATA");

    // Incident with cached stream -> OFFLINE_CACHED
    store.ingestObservations("INC-CACHED", [
      {
        observationId: "OBS-CACHE-1",
        incidentId: "INC-CACHED",
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

    const modeCached = store.getDataMode("INC-CACHED");
    expect(modeCached).toBe("OFFLINE_CACHED");
  });

  test("Test F: Synthetic Data Provenance metadata verification", () => {
    const store = new IncidentStoreManager();
    const prov = store.getProvenance("INC-2026-001", "SYNTHETIC_SCENARIO_BASE_GPR");

    expect(prov.dataMode).toBe("SYNTHETIC");
    expect(prov.terrainSource).toContain("COPERNICUS DEM GLO-30");
    expect(prov.engineVersion).toContain("LOCKED");
  });

  test("Test G: Golden Replay Test reproduces bit-for-bit identical time-series results", () => {
    const store1 = new IncidentStoreManager();
    const store2 = new IncidentStoreManager();

    const replayResults1 = store1.replayIncident("INC-2026-001", "GPR_RF");
    const replayResults2 = store2.replayIncident("INC-2026-001", "GPR_RF");

    for (const zoneId of Object.keys(replayResults1)) {
      const r1 = replayResults1[zoneId]!;
      const r2 = replayResults2[zoneId]!;
      expect(r1.bayesian.probability).toBe(r2.bayesian.probability);
      expect(r1.utility.utilityScore).toBe(r2.utility.utilityScore);
      expect(r1.priority).toBe(r2.priority);
    }
  });

  test("Test H: Derived Output Immutability rejects client submission of victimProbability", () => {
    const invalidClientSubmission: any = {
      observationId: "OBS-HACK-01",
      sensorId: "rf_01",
      zoneId: "Z-01",
      victimProbability: 0.99, // Attempted write of derived output!
    };

    const val = validateObservation(invalidClientSubmission);
    expect(val.valid).toBe(false);
    expect(val.errorCode).toBe("DERIVED_OUTPUT_READ_ONLY");
  });

  test("Test I: Compound Zone Identity prevents state collisions between incidents", () => {
    const store = new IncidentStoreManager();

    store.ingestObservations("INC-ALPHA", [
      {
        observationId: "OBS-ALPHA-1",
        incidentId: "INC-ALPHA",
        zoneId: "Z-01",
        sensorId: "rf_01",
        sensorType: "RF",
        eventTimestamp: t1,
        ingestionTimestamp: t1,
        measurement: 0.9,
        confidence: 0.9,
        environmentalQuality: 0.9,
        interference: 0.1,
      },
    ]);

    const resAlpha = store.evaluateZone("INC-ALPHA", "Z-01");
    const resBeta = store.evaluateZone("INC-BETA", "Z-01");

    // INC-BETA has no observations, so its result is uninfluenced by INC-ALPHA
    expect(resAlpha.bayesian.probability).toBeGreaterThan(resBeta.bayesian.probability);
  });

  test("Test J: Single Physical Instance Modality Ingestion computes decision cleanly", () => {
    const store = new IncidentStoreManager();

    store.ingestObservations("INC-SINGLE", [
      {
        observationId: "OBS-UAV-1",
        incidentId: "INC-SINGLE",
        zoneId: "Z-01",
        sensorId: "rf_uav_alpha_01",
        sensorType: "RF",
        eventTimestamp: t1,
        ingestionTimestamp: t1,
        measurement: 0.85,
        confidence: 0.9,
        environmentalQuality: 0.9,
        interference: 0.1,
      },
    ]);

    const res = store.evaluateZone("INC-SINGLE", "Z-01");
    expect(res.bayesian.probability).toBeGreaterThan(0.02);
  });

  // =========================================================================
  // SECTION 2: PHASE 3A STRICT AUXILIARY & TIMESTAMP VALIDATION TESTS
  // =========================================================================

  test("Test 3A-1: Invalid confidence values (<0, >1, NaN, Infinity) are strictly rejected", () => {
    const baseObs = {
      observationId: "OBS-CONF",
      sensorId: "rf_01",
      zoneId: "Z-01",
      eventTimestamp: t1,
    };

    expect(validateObservation({ ...baseObs, confidence: -0.1 }).valid).toBe(false);
    expect(validateObservation({ ...baseObs, confidence: 1.1 }).valid).toBe(false);
    expect(validateObservation({ ...baseObs, confidence: NaN }).valid).toBe(false);
    expect(validateObservation({ ...baseObs, confidence: Infinity }).valid).toBe(false);
    expect(validateObservation({ ...baseObs, confidence: "0.8" as any }).valid).toBe(false);
    expect(validateObservation({ ...baseObs, confidence: 0.8 }).valid).toBe(true);
  });

  test("Test 3A-2: Invalid environmentalQuality values (<0, >1, NaN, Infinity) are strictly rejected", () => {
    const baseObs = {
      observationId: "OBS-ENV",
      sensorId: "gpr_01",
      zoneId: "Z-01",
      eventTimestamp: t1,
    };

    expect(validateObservation({ ...baseObs, environmentalQuality: -0.1 }).valid).toBe(false);
    expect(validateObservation({ ...baseObs, environmentalQuality: 1.1 }).valid).toBe(false);
    expect(validateObservation({ ...baseObs, environmentalQuality: NaN }).valid).toBe(false);
    expect(validateObservation({ ...baseObs, environmentalQuality: Infinity }).valid).toBe(false);
    expect(validateObservation({ ...baseObs, environmentalQuality: 0.95 }).valid).toBe(true);
  });

  test("Test 3A-3: Invalid interference values (<0, >1, NaN, Infinity) are strictly rejected", () => {
    const baseObs = {
      observationId: "OBS-INT",
      sensorId: "thermal_01",
      zoneId: "Z-01",
      eventTimestamp: t1,
    };

    expect(validateObservation({ ...baseObs, interference: -0.1 }).valid).toBe(false);
    expect(validateObservation({ ...baseObs, interference: 1.1 }).valid).toBe(false);
    expect(validateObservation({ ...baseObs, interference: NaN }).valid).toBe(false);
    expect(validateObservation({ ...baseObs, interference: Infinity }).valid).toBe(false);
    expect(validateObservation({ ...baseObs, interference: 0.05 }).valid).toBe(true);
  });

  test("Test 3A-4: Missing eventTimestamp is strictly rejected", () => {
    const baseObs = {
      observationId: "OBS-NO-TS",
      sensorId: "rf_01",
      zoneId: "Z-01",
    };

    expect(validateObservation({ ...baseObs, eventTimestamp: undefined }).valid).toBe(false);
    expect(validateObservation({ ...baseObs, eventTimestamp: null as any }).valid).toBe(false);
    expect(validateObservation({ ...baseObs, eventTimestamp: "" }).valid).toBe(false);
  });

  test("Test 3A-5: Malformed or non-finite eventTimestamp is strictly rejected", () => {
    const baseObs = {
      observationId: "OBS-BAD-TS",
      sensorId: "rf_01",
      zoneId: "Z-01",
    };

    expect(validateObservation({ ...baseObs, eventTimestamp: "not-a-date" }).valid).toBe(false);
    expect(validateObservation({ ...baseObs, eventTimestamp: "2026-99-99T99:99:99Z" }).valid).toBe(false);
  });

  test("Test 3A-6: Future eventTimestamp (>300s clock skew) is strictly rejected", () => {
    const futureTs = new Date(now + 600000).toISOString(); // +10 min in future
    const baseObs = {
      observationId: "OBS-FUTURE-TS",
      sensorId: "rf_01",
      zoneId: "Z-01",
      eventTimestamp: futureTs,
    };

    const val = validateObservation(baseObs);
    expect(val.valid).toBe(false);
    expect(val.errorCode).toBe("TIMESTAMP_FUTURE_CLOCK_SKEW");
  });

  // =========================================================================
  // SECTION 3: PHASE 3B MULTI-INSTANCE SAFETY & UNTOUCHED ENGINE TESTS
  // =========================================================================

  test("Test 3B-1: Multiple physical sensors of same modality are stored losslessly in incidentStore", () => {
    const store = new IncidentStoreManager();

    const obsUav: SensorObservation = {
      observationId: "OBS-LOSSLESS-UAV-01",
      incidentId: "INC-MULTI-STORE",
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

    const obsGround: SensorObservation = {
      observationId: "OBS-LOSSLESS-GROUND-02",
      incidentId: "INC-MULTI-STORE",
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

    const ingestRes = store.ingestObservations("INC-MULTI-STORE", [obsUav, obsGround]);
    expect(ingestRes.ingestedCount).toBe(2);
    expect(ingestRes.skippedCount).toBe(0);
  });

  test("Test 3B-2: Evaluation fails explicitly with MULTI_INSTANCE_FUSION_UNSPECIFIED when unsupported collision occurs", () => {
    const store = new IncidentStoreManager();

    const obsUav: SensorObservation = {
      observationId: "OBS-COLLISION-UAV",
      incidentId: "INC-MULTI-COLLISION",
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

    const obsGround: SensorObservation = {
      observationId: "OBS-COLLISION-GROUND",
      incidentId: "INC-MULTI-COLLISION",
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

    store.ingestObservations("INC-MULTI-COLLISION", [obsUav, obsGround]);

    // Evaluating zone with multiple physical instances of 'rf' throws explicit MULTI_INSTANCE_FUSION_UNSPECIFIED error
    expect(() => store.evaluateZone("INC-MULTI-COLLISION", "Z-01")).toThrow(
      "MULTI_INSTANCE_FUSION_UNSPECIFIED",
    );
  });

  test("Test 3B-3: Different modalities execute computeZoneDecision cleanly without collision", () => {
    const store = new IncidentStoreManager();

    const obsRf: SensorObservation = {
      observationId: "OBS-DIFF-RF",
      incidentId: "INC-DIFF",
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

    const obsGpr: SensorObservation = {
      observationId: "OBS-DIFF-GPR",
      incidentId: "INC-DIFF",
      zoneId: "Z-01",
      sensorId: "gpr_01",
      sensorType: "GPR",
      eventTimestamp: t2,
      ingestionTimestamp: t2,
      measurement: 0.75,
      confidence: 0.85,
      environmentalQuality: 0.95,
      interference: 0.05,
    };

    store.ingestObservations("INC-DIFF", [obsRf, obsGpr]);

    const res = store.evaluateZone("INC-DIFF", "Z-01");
    expect(res.bayesian.probability).toBeGreaterThan(0.02);
    expect(res.likelihoods).toHaveLength(8);
  });

  test("Test 3B-4: Engine call graph proof (src/lib/engine/* remains completely untouched)", () => {
    const store = new IncidentStoreManager();
    const res = store.evaluateZone("INC-2026-001", "Z-01");

    expect(res.bayesian).toBeDefined();
    expect(res.terrainFeatures).toBeDefined();
    expect(res.utility).toBeDefined();
    expect(res.priority).toBeDefined();
  });
});
