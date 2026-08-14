import { describe, expect, test } from "bun:test";
import { IncidentStoreManager } from "../incidentStore";
import { PhysicalSensorAdapter } from "../sensorAdapter";
import type { PhysicalSensorPacket } from "@/lib/types";

describe("Phase 5 — Real Sensor Integration Readiness Suite", () => {
  const now = Date.now();
  const t1 = new Date(now - 1000000).toISOString();
  const t2 = new Date(now - 800000).toISOString();
  const t3 = new Date(now - 600000).toISOString();
  const t4 = new Date(now - 400000).toISOString();

  // =========================================================================
  // TEST A: Valid Physical Sensor Packet
  // =========================================================================
  test("Test A: Valid physical sensor packet is correctly normalized into SensorObservation", () => {
    const packet: PhysicalSensorPacket = {
      rawPacketId: "RAW-PKT-A1",
      physicalSensorId: "rf_uav_alpha",
      modality: "RF",
      incidentId: "INC-P5",
      zoneId: "Z-01",
      eventTimestampIso: t1,
      transportProtocol: "MQTT_JSON",
      rawPayload: { rssi_dbm: -65, battery_v: 12.4 },
      normalizedMeasurement: 0.85,
      normalizedConfidence: 0.9,
      environmentalQuality: 0.95,
      interference: 0.05,
      dataMode: "REAL_SENSOR",
    };

    const res = PhysicalSensorAdapter.processPhysicalPacket(packet);
    expect(res.valid).toBe(true);
    expect(res.isQuarantined).toBe(false);
    expect(res.observation).toBeDefined();
    expect(res.observation?.measurement).toBe(0.85);
    expect(res.observation?.metadata?.dataMode).toBe("REAL_SENSOR");
    expect(res.observation?.metadata?.rawPayload).toEqual({ rssi_dbm: -65, battery_v: 12.4 });
  });

  // =========================================================================
  // TEST B: Malformed Packet
  // =========================================================================
  test("Test B: Malformed non-object or empty packet is rejected with INVALID_SCHEMA", () => {
    const res = PhysicalSensorAdapter.processPhysicalPacket(null as any);
    expect(res.valid).toBe(false);
    expect(res.errorCode).toBe("INVALID_SCHEMA");
  });

  // =========================================================================
  // TEST C: Missing Required Field
  // =========================================================================
  test("Test C: Missing mandatory fields (rawPacketId, physicalSensorId, modality, eventTimestampIso) are rejected", () => {
    const base: PhysicalSensorPacket = {
      rawPacketId: "RAW-C",
      physicalSensorId: "rf_01",
      modality: "RF",
      incidentId: "INC-P5",
      zoneId: "Z-01",
      eventTimestampIso: t1,
      rawPayload: {},
    };

    expect(PhysicalSensorAdapter.processPhysicalPacket({ ...base, rawPacketId: "" }).errorCode).toBe("INVALID_SCHEMA");
    expect(PhysicalSensorAdapter.processPhysicalPacket({ ...base, physicalSensorId: "" }).errorCode).toBe("INVALID_SCHEMA");
    expect(PhysicalSensorAdapter.processPhysicalPacket({ ...base, modality: "" }).errorCode).toBe("INVALID_SCHEMA");
    expect(PhysicalSensorAdapter.processPhysicalPacket({ ...base, eventTimestampIso: "" }).errorCode).toBe("MISSING_TIMESTAMP");
  });

  // =========================================================================
  // TEST D: Invalid Numeric Value
  // =========================================================================
  test("Test D: Out-of-bounds numeric measurements (>1.0 or <0.0) return MEASUREMENT_OUT_OF_BOUNDS", () => {
    const base: PhysicalSensorPacket = {
      rawPacketId: "RAW-D",
      physicalSensorId: "rf_01",
      modality: "RF",
      incidentId: "INC-P5",
      zoneId: "Z-01",
      eventTimestampIso: t1,
      rawPayload: {},
      normalizedMeasurement: 1.5,
    };

    const res = PhysicalSensorAdapter.processPhysicalPacket(base);
    expect(res.valid).toBe(false);
    expect(res.errorCode).toBe("MEASUREMENT_OUT_OF_BOUNDS");
  });

  // =========================================================================
  // TEST E: NaN / Infinity
  // =========================================================================
  test("Test E: NaN and Infinity numeric values return explicit 400 error codes", () => {
    const base: PhysicalSensorPacket = {
      rawPacketId: "RAW-E",
      physicalSensorId: "rf_01",
      modality: "RF",
      incidentId: "INC-P5",
      zoneId: "Z-01",
      eventTimestampIso: t1,
      rawPayload: {},
    };

    expect(PhysicalSensorAdapter.processPhysicalPacket({ ...base, normalizedMeasurement: NaN }).errorCode).toBe("MEASUREMENT_OUT_OF_BOUNDS");
    expect(PhysicalSensorAdapter.processPhysicalPacket({ ...base, normalizedConfidence: Infinity }).errorCode).toBe("CONFIDENCE_OUT_OF_BOUNDS");
  });

  // =========================================================================
  // TEST F: Invalid Unit Declaration / Raw Physical Data Quarantine
  // =========================================================================
  test("Test F: Raw physical metrics with non-normalized units and no [0,1] evidence are quarantined", () => {
    const packet: PhysicalSensorPacket = {
      rawPacketId: "RAW-F-RSSI",
      physicalSensorId: "rf_sensor_99",
      modality: "RF",
      incidentId: "INC-P5",
      zoneId: "Z-01",
      eventTimestampIso: t1,
      unitDeclarations: [{ metricName: "rssi", unit: "dBm", isNormalized0to1: false }],
      rawPayload: { rssi_dbm: -82.5 },
    };

    const res = PhysicalSensorAdapter.processPhysicalPacket(packet);
    expect(res.valid).toBe(true);
    expect(res.isQuarantined).toBe(true);
    expect(res.quarantineReason).toContain("UNSUPPORTED_FOR_DECISION");
    expect(res.observation?.measurement).toBeNull();
    expect(res.observation?.metadata?.rawPayload.rssi_dbm).toBe(-82.5);
  });

  // =========================================================================
  // TEST G: Duplicate Observation Idempotency
  // =========================================================================
  test("Test G: Submitting duplicate physical packet is ingested once and skipped on second attempt", () => {
    const store = new IncidentStoreManager();
    const packet: PhysicalSensorPacket = {
      rawPacketId: "RAW-G-IDEM",
      physicalSensorId: "gpr_01",
      modality: "GPR",
      incidentId: "INC-P5-G",
      zoneId: "Z-01",
      eventTimestampIso: t1,
      rawPayload: { radargram_id: "scan_001" },
      normalizedMeasurement: 0.75,
      normalizedConfidence: 0.85,
    };

    const resAdapter = PhysicalSensorAdapter.processPhysicalPacket(packet);
    expect(resAdapter.valid).toBe(true);

    const r1 = store.ingestObservations("INC-P5-G", [resAdapter.observation!]);
    expect(r1.ingestedCount).toBe(1);

    const r2 = store.ingestObservations("INC-P5-G", [resAdapter.observation!]);
    expect(r2.ingestedCount).toBe(0);
    expect(r2.skippedCount).toBe(1);
  });

  // =========================================================================
  // TEST H: Unknown Sensor Modality
  // =========================================================================
  test("Test H: Unrecognized sensor modality returns UNKNOWN_SENSOR_MODALITY", () => {
    const packet: PhysicalSensorPacket = {
      rawPacketId: "RAW-H-UNKNOWN",
      physicalSensorId: "quantum_scanner_01",
      modality: "QUANTUM_TELEPATHIC" as any,
      incidentId: "INC-P5",
      zoneId: "Z-01",
      eventTimestampIso: t1,
      rawPayload: {},
    };

    const res = PhysicalSensorAdapter.processPhysicalPacket(packet);
    expect(res.valid).toBe(false);
    expect(res.errorCode).toBe("UNKNOWN_SENSOR_MODALITY");
  });

  // =========================================================================
  // TEST I: Unsupported Modality Quarantine Engine Safety
  // =========================================================================
  test("Test I: Quarantined observation contributes exactly zero evidence (LR=1.0) to decision engine", () => {
    const store = new IncidentStoreManager();
    const packet: PhysicalSensorPacket = {
      rawPacketId: "RAW-I-RAWONLY",
      physicalSensorId: "thermal_flir_01",
      modality: "THERMAL",
      incidentId: "INC-P5-I",
      zoneId: "Z-01",
      eventTimestampIso: t1,
      unitDeclarations: [{ metricName: "digital_counts", unit: "counts", isNormalized0to1: false }],
      rawPayload: { digital_counts: 14200 },
    };

    const adapterRes = PhysicalSensorAdapter.processPhysicalPacket(packet);
    expect(adapterRes.isQuarantined).toBe(true);

    store.ingestObservations("INC-P5-I", [adapterRes.observation!]);
    const engineRes = store.evaluateZone("INC-P5-I", "Z-01");

    // Quarantined thermal sensor with measurement = null results in thermal LR = 1.0 (log-odds = 0)
    const thermalLikelihood = engineRes.likelihoods.find((l) => l.sensorId === "thermal");
    expect(thermalLikelihood?.likelihoodRatio).toBe(1.0);
    expect(thermalLikelihood?.isUnavailable).toBe(true);
  });

  // =========================================================================
  // TEST J: Stale Historical Observation
  // =========================================================================
  test("Test J: Stale historical observation inserted out-of-order is stored losslessly", () => {
    const store = new IncidentStoreManager();
    const oldPacket: PhysicalSensorPacket = {
      rawPacketId: "RAW-J-OLD",
      physicalSensorId: "rf_01",
      modality: "RF",
      incidentId: "INC-P5-J",
      zoneId: "Z-01",
      eventTimestampIso: t1, // Older timestamp
      rawPayload: {},
      normalizedMeasurement: 0.8,
    };

    const newPacket: PhysicalSensorPacket = {
      rawPacketId: "RAW-J-NEW",
      physicalSensorId: "gpr_01",
      modality: "GPR",
      incidentId: "INC-P5-J",
      zoneId: "Z-01",
      eventTimestampIso: t2, // Newer timestamp
      rawPayload: {},
      normalizedMeasurement: 0.7,
    };

    // Ingest NEW first, then OLD
    store.ingestObservations("INC-P5-J", [PhysicalSensorAdapter.processPhysicalPacket(newPacket).observation!]);
    store.ingestObservations("INC-P5-J", [PhysicalSensorAdapter.processPhysicalPacket(oldPacket).observation!]);

    const res = store.evaluateZone("INC-P5-J", "Z-01");
    expect(res.bayesian.probability).toBeGreaterThan(0.1);
  });

  // =========================================================================
  // TEST K: Future Timestamp Clock Skew
  // =========================================================================
  test("Test K: Future timestamp beyond 300s clock skew returns TIMESTAMP_FUTURE_CLOCK_SKEW", () => {
    const futureTime = new Date(Date.now() + 600000).toISOString();
    const packet: PhysicalSensorPacket = {
      rawPacketId: "RAW-K-FUTURE",
      physicalSensorId: "rf_01",
      modality: "RF",
      incidentId: "INC-P5",
      zoneId: "Z-01",
      eventTimestampIso: futureTime,
      rawPayload: {},
    };

    const res = PhysicalSensorAdapter.processPhysicalPacket(packet);
    expect(res.valid).toBe(false);
    expect(res.errorCode).toBe("TIMESTAMP_FUTURE_CLOCK_SKEW");
  });

  // =========================================================================
  // TEST L: Out-of-Order Chronological Cascade Replay Equivalence
  // =========================================================================
  test("Test L: Scrambled physical packet arrival stream produces 100% identical decision result", () => {
    const store1 = new IncidentStoreManager();
    const store2 = new IncidentStoreManager();

    const p1: PhysicalSensorPacket = { rawPacketId: "PKT-L1", physicalSensorId: "rf_01", modality: "RF", incidentId: "INC-L", zoneId: "Z-01", eventTimestampIso: t1, rawPayload: {}, normalizedMeasurement: 0.8, normalizedConfidence: 0.9 };
    const p2: PhysicalSensorPacket = { rawPacketId: "PKT-L2", physicalSensorId: "gpr_01", modality: "GPR", incidentId: "INC-L", zoneId: "Z-01", eventTimestampIso: t2, rawPayload: {}, normalizedMeasurement: 0.7, normalizedConfidence: 0.85 };
    const p3: PhysicalSensorPacket = { rawPacketId: "PKT-L3", physicalSensorId: "thermal_01", modality: "THERMAL", incidentId: "INC-L", zoneId: "Z-01", eventTimestampIso: t3, rawPayload: {}, normalizedMeasurement: 0.6, normalizedConfidence: 0.8 };
    const p4: PhysicalSensorPacket = { rawPacketId: "PKT-L4", physicalSensorId: "seismic_01", modality: "SEISMIC", incidentId: "INC-L", zoneId: "Z-01", eventTimestampIso: t4, rawPayload: {}, normalizedMeasurement: 0.5, normalizedConfidence: 0.75 };

    const o1 = PhysicalSensorAdapter.processPhysicalPacket(p1).observation!;
    const o2 = PhysicalSensorAdapter.processPhysicalPacket(p2).observation!;
    const o3 = PhysicalSensorAdapter.processPhysicalPacket(p3).observation!;
    const o4 = PhysicalSensorAdapter.processPhysicalPacket(p4).observation!;

    // Stream 1: Chronological [O1, O2, O3, O4]
    store1.ingestObservations("INC-L", [o1, o2, o3, o4]);
    const resChrono = store1.evaluateZone("INC-L", "Z-01");

    // Stream 2: Scrambled [O4, O1, O3, O2]
    store2.ingestObservations("INC-L", [o4, o1, o3, o2]);
    const resScrambled = store2.evaluateZone("INC-L", "Z-01");

    expect(resChrono.bayesian.probability).toBe(resScrambled.bayesian.probability);
    expect(resChrono.utility.utilityScore).toBe(resScrambled.utility.utilityScore);
  });

  // =========================================================================
  // TEST M: Real Sensor Provenance
  // =========================================================================
  test("Test M: Physical packet explicitly tags dataMode as REAL_SENSOR", () => {
    const packet: PhysicalSensorPacket = {
      rawPacketId: "RAW-M-REAL",
      physicalSensorId: "hardware_rf_unit_01",
      modality: "RF",
      incidentId: "INC-P5",
      zoneId: "Z-01",
      eventTimestampIso: t1,
      rawPayload: { hardware_sn: "SN-99812" },
      normalizedMeasurement: 0.9,
      dataMode: "REAL_SENSOR",
    };

    const res = PhysicalSensorAdapter.processPhysicalPacket(packet);
    expect(res.observation?.metadata?.dataMode).toBe("REAL_SENSOR");
  });

  // =========================================================================
  // TEST N: Synthetic Provenance
  // =========================================================================
  test("Test N: Demo simulated streams explicitly retain dataMode as SYNTHETIC", () => {
    const store = new IncidentStoreManager();
    const prov = store.getProvenance("INC-2026-001");
    expect(prov.dataMode).toBe("SYNTHETIC");
  });

  // =========================================================================
  // TEST O: Raw-Data Preservation
  // =========================================================================
  test("Test O: Raw RSSI and spectrum data are preserved losslessly in observation metadata", () => {
    const packet: PhysicalSensorPacket = {
      rawPacketId: "RAW-O-PRESERVE",
      physicalSensorId: "gpr_radar_pro",
      modality: "GPR",
      incidentId: "INC-P5",
      zoneId: "Z-01",
      eventTimestampIso: t1,
      rawPayload: { dielectric_constant: 3.15, raw_a_scan: [12, 45, 99, 140, 22] },
      normalizedMeasurement: 0.82,
    };

    const res = PhysicalSensorAdapter.processPhysicalPacket(packet);
    expect(res.observation?.metadata?.rawPayload).toEqual({ dielectric_constant: 3.15, raw_a_scan: [12, 45, 99, 140, 22] });
  });

  // =========================================================================
  // TEST P: Derived-Output Immutability
  // =========================================================================
  test("Test P: Client packet attempting to set victimProbability returns DERIVED_OUTPUT_READ_ONLY", () => {
    const packet: PhysicalSensorPacket = {
      rawPacketId: "RAW-P-FORBIDDEN",
      physicalSensorId: "rf_01",
      modality: "RF",
      incidentId: "INC-P5",
      zoneId: "Z-01",
      eventTimestampIso: t1,
      rawPayload: { victimProbability: 0.999 }, // Forbidden derived output injection
    };

    const res = PhysicalSensorAdapter.processPhysicalPacket(packet);
    expect(res.valid).toBe(false);
    expect(res.errorCode).toBe("DERIVED_OUTPUT_READ_ONLY");
  });

  // =========================================================================
  // TEST Q: Same-Modality Multi-Instance Collision
  // =========================================================================
  test("Test Q: Multi-instance same-modality collision throws MULTI_INSTANCE_FUSION_UNSPECIFIED", () => {
    const store = new IncidentStoreManager();
    const p1: PhysicalSensorPacket = { rawPacketId: "PKT-Q1", physicalSensorId: "rf_uav_01", modality: "RF", incidentId: "INC-Q", zoneId: "Z-01", eventTimestampIso: t1, rawPayload: {}, normalizedMeasurement: 0.8 };
    const p2: PhysicalSensorPacket = { rawPacketId: "PKT-Q2", physicalSensorId: "rf_ground_02", modality: "RF", incidentId: "INC-Q", zoneId: "Z-01", eventTimestampIso: t2, rawPayload: {}, normalizedMeasurement: 0.85 };

    const o1 = PhysicalSensorAdapter.processPhysicalPacket(p1).observation!;
    const o2 = PhysicalSensorAdapter.processPhysicalPacket(p2).observation!;

    store.ingestObservations("INC-Q", [o1, o2]);
    expect(() => store.evaluateZone("INC-Q", "Z-01")).toThrow("MULTI_INSTANCE_FUSION_UNSPECIFIED");
  });

  // =========================================================================
  // TEST R: Offline Behavior
  // =========================================================================
  test("Test R: Network disconnect strictly distinguishes OFFLINE_CACHED from OFFLINE_NO_DATA", () => {
    const store = new IncidentStoreManager();
    store.setNetworkConnected(false);

    expect(store.getDataMode("INC-EMPTY")).toBe("OFFLINE_NO_DATA");

    const p1: PhysicalSensorPacket = { rawPacketId: "PKT-R1", physicalSensorId: "rf_01", modality: "RF", incidentId: "INC-R", zoneId: "Z-01", eventTimestampIso: t1, rawPayload: {}, normalizedMeasurement: 0.8 };
    store.ingestObservations("INC-R", [PhysicalSensorAdapter.processPhysicalPacket(p1).observation!]);

    expect(store.getDataMode("INC-R")).toBe("OFFLINE_CACHED");
  });

  // =========================================================================
  // TEST S: Sensor Reconnection
  // =========================================================================
  test("Test S: Reconnecting sensor stream resumes chronological replay cleanly", () => {
    const store = new IncidentStoreManager();
    const p1: PhysicalSensorPacket = { rawPacketId: "PKT-S1", physicalSensorId: "rf_01", modality: "RF", incidentId: "INC-S", zoneId: "Z-01", eventTimestampIso: t1, rawPayload: {}, normalizedMeasurement: 0.8 };
    const p2: PhysicalSensorPacket = { rawPacketId: "PKT-S2", physicalSensorId: "gpr_01", modality: "GPR", incidentId: "INC-S", zoneId: "Z-01", eventTimestampIso: t2, rawPayload: {}, normalizedMeasurement: 0.7 };

    store.setNetworkConnected(false);
    store.ingestObservations("INC-S", [PhysicalSensorAdapter.processPhysicalPacket(p1).observation!]);

    // Reconnect
    store.setNetworkConnected(true);
    store.ingestObservations("INC-S", [PhysicalSensorAdapter.processPhysicalPacket(p2).observation!]);

    const res = store.evaluateZone("INC-S", "Z-01");
    expect(res.bayesian.probability).toBeGreaterThan(0.1);
  });

  // =========================================================================
  // TEST T: End-to-End Physical Packet -> Adapter -> Store -> Engine Boundary
  // =========================================================================
  test("Test T: Complete physical packet pipeline computes zone decision cleanly without mathematical compromise", () => {
    const store = new IncidentStoreManager();
    const p1: PhysicalSensorPacket = {
      rawPacketId: "RAW-T-E2E-1",
      physicalSensorId: "rf_uav_alpha_99",
      modality: "RF",
      incidentId: "INC-T-E2E",
      zoneId: "Z-01",
      eventTimestampIso: t1,
      transportProtocol: "LORAWAN_V1.0",
      rawPayload: { rssi_dbm: -68, frequency_mhz: 457.0 },
      normalizedMeasurement: 0.88,
      normalizedConfidence: 0.92,
      environmentalQuality: 0.9,
      interference: 0.1,
      dataMode: "REAL_SENSOR",
    };

    const adapterRes = PhysicalSensorAdapter.processPhysicalPacket(p1);
    expect(adapterRes.valid).toBe(true);

    store.ingestObservations("INC-T-E2E", [adapterRes.observation!]);
    const decision = store.evaluateZone("INC-T-E2E", "Z-01");

    expect(decision.zoneId).toBe("Z-01");
    expect(decision.bayesian.probability).toBeGreaterThan(0.15);
  });
});
