import { describe, expect, test } from "bun:test";
import { PilotDataHarness } from "../pilotDataHarness";
import type { FieldObservationPacket } from "@/lib/types";

// Import Phase 7E manifest and observation dataset fixtures
import manifest7E from "../../../../data/real_pilot/field_trial_phase7e_manifest.json";
import dataset7E from "../../../../data/real_pilot/real_observation_phase7e_records.json";

describe("Phase 7E — Real Physical Field Trial & Validation Protocol", () => {
  const samplePacket: FieldObservationPacket = {
    experimentId: "EXP-REAL-2026-PHASE7E",
    sensorSerialId: "SN-457-PRO-9812",
    modality: "RF",
    timestampIso: new Date().toISOString(),
    rtkGps: {
      lat: 34.183901,
      lon: 77.562102,
      altM: 4150.2,
      hAccM: 0.012, // 1.2cm RTK accuracy
      vAccM: 0.018,
    },
    snowpack: {
      densityKgM3: 360.0,
      lwcPercent: 1.8,
      tempC: -14.0,
    },
    rawPayload: {
      rssiDbm: -68.4,
      rawSignalPowerV: 0.82,
      backgroundNoiseV: 0.015,
      fluxBearingDeg: 42,
    },
    groundTruth: {
      targetPresent: true,
      targetId: "REF-BEACON-7E-01",
      depthM: 1.2,
      orientationDeg: 30,
    },
    dataMode: "REAL_SENSOR",
  };

  test("Test 1: Phase 7E manifest fixture is loaded and validated cleanly", () => {
    expect(manifest7E.experimentId).toBe("EXP-REAL-2026-PHASE7E");
    expect(manifest7E.dataMode).toBe("REAL_SENSOR");
    expect(manifest7E.rtkGpsAccuracyRequirementM).toBe(0.05);
  });

  test("Test 2: Phase 7E observation dataset fixture is ingested cleanly", () => {
    const res = PilotDataHarness.processRealFieldDataset(dataset7E);
    expect(res.valid).toBe(true);
    expect(res.dataMode).toBe("REAL_SENSOR");
    expect(res.totalCount).toBe(8);
    expect(res.validCount).toBe(8);
  });

  test("Test 3: Dataset partitioning splits 8 observations into 50% Calib (4) / 25% Val (2) / 25% Holdout (2)", () => {
    const res = PilotDataHarness.processRealFieldDataset(dataset7E);
    expect(res.calibrationSplit.length).toBe(4);
    expect(res.validationSplit.length).toBe(2);
    expect(res.holdoutSplit.length).toBe(2);
  });

  test("Test 4: Data mode REAL_SENSOR is preserved losslessly across all 3 partitioned dataset splits", () => {
    const res = PilotDataHarness.processRealFieldDataset(dataset7E);
    expect(res.calibrationSplit.every((p) => p.dataMode === "REAL_SENSOR")).toBe(true);
    expect(res.validationSplit.every((p) => p.dataMode === "REAL_SENSOR")).toBe(true);
    expect(res.holdoutSplit.every((p) => p.dataMode === "REAL_SENSOR")).toBe(true);
  });

  test("Test 5: Submitting real physical packet with raw metrics retains RSSI and flux bearing losslessly", () => {
    const res = PilotDataHarness.processFieldObservationPacket(samplePacket);
    expect(res.valid).toBe(true);
    expect(res.packet?.rawPayload.rssiDbm).toBe(-68.4);
    expect(res.packet?.rawPayload.fluxBearingDeg).toBe(42);
  });

  test("Test 6: processPhase7EDataset produces a structured Phase7EValidationResult", () => {
    const report = PilotDataHarness.processPhase7EDataset(dataset7E);
    expect(report.experimentId).toBe("EXP-REAL-2026-PHASE7E");
    expect(report.dataMode).toBe("REAL_SENSOR");
    expect(report.totalObservations).toBe(8);
    expect(report.calibrationCount).toBe(4);
    expect(report.engineModified).toBe(false);
  });

  test("Test 7: Discrepancy matrix classifies modalities into valid Phase 7E classification statuses", () => {
    const report = PilotDataHarness.processPhase7EDataset(dataset7E);
    expect(report.discrepancyMatrix.length).toBe(4);
    const statuses = report.discrepancyMatrix.map((m) => m.classification);
    const validSet = new Set(["SUPPORTED", "PARTIALLY_SUPPORTED", "DISCREPANCY", "INSUFFICIENT_DATA"]);
    expect(statuses.every((s) => validSet.has(s))).toBe(true);
  });

  test("Test 8: Mandatory safety boundary directive string is present in validation result output", () => {
    const report = PilotDataHarness.processPhase7EDataset(dataset7E);
    expect(report.safetyBoundaryNote).toContain("This field trial validates the measurement and statistical assumptions of the system.");
    expect(report.safetyBoundaryNote).toContain("It does not by itself authorize live tactical Search-and-Rescue deployment.");
  });

  test("Test 9: Packet attempting to set victimProbability returns DERIVED_OUTPUT_READ_ONLY", () => {
    const invalid = { ...samplePacket, victimProbability: 0.95 };
    const res = PilotDataHarness.processFieldObservationPacket(invalid);
    expect(res.valid).toBe(false);
    expect(res.isQuarantined).toBe(true);
    expect(res.errorCode).toBe("DERIVED_OUTPUT_READ_ONLY");
  });

  test("Test 10: Production decision engine is confirmed untouched (engineModified: false)", () => {
    const report = PilotDataHarness.processPhase7EDataset(dataset7E);
    expect(report.engineModified).toBe(false);
  });
});
