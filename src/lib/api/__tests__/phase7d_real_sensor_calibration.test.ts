import { describe, expect, test } from "bun:test";
import { PilotDataHarness } from "../pilotDataHarness";
import type { FieldObservationPacket } from "@/lib/types";

// Import real field trial manifest and record fixtures
import realManifest from "../../../../data/real_pilot/field_trial_alpha_manifest.json";
import realDataset from "../../../../data/real_pilot/real_observation_records.json";

describe("Phase 7D — Real Pilot Field Data Acquisition & Empirical Calibration", () => {
  const sampleRealPacket: FieldObservationPacket = {
    experimentId: "EXP-REAL-2026-ALPHA",
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
      targetId: "REF-BEACON-01",
      depthM: 1.2,
      orientationDeg: 30,
    },
    dataMode: "REAL_SENSOR",
  };

  test("Test 1: Real physical sensor packet explicitly tagged REAL_SENSOR is ingested and WORM tagged", () => {
    const res = PilotDataHarness.processFieldObservationPacket(sampleRealPacket);
    expect(res.valid).toBe(true);
    expect(res.isQuarantined).toBe(false);
    expect(res.packet).toBeDefined();
    expect(res.packet?.dataMode).toBe("REAL_SENSOR");
    expect(res.wormTag).toContain("WORM-EXP-REAL-2026-ALPHA-SN-457-PRO-9812-");
  });

  test("Test 2: Real field trial manifest fixture is loaded and validated cleanly", () => {
    expect(realManifest.trialId).toBe("EXP-REAL-2026-ALPHA");
    expect(realManifest.dataMode).toBe("REAL_SENSOR");
    expect(realManifest.elevationM).toBe(4150);
  });

  test("Test 3: Real field observation dataset is ingested and partitioned into 50% Calib / 25% Val / 25% Holdout", () => {
    const res = PilotDataHarness.processRealFieldDataset(realDataset);
    expect(res.valid).toBe(true);
    expect(res.dataMode).toBe("REAL_SENSOR");
    expect(res.totalCount).toBe(5);
    expect(res.validCount).toBe(5);
    expect(res.calibrationSplit.length).toBe(2); // 50% (floor)
    expect(res.validationSplit.length).toBe(1);   // 25% (floor)
    expect(res.holdoutSplit.length).toBe(2);      // 25% (remainder)
  });

  test("Test 4: Data mode REAL_SENSOR is preserved losslessly across all partitioned dataset splits", () => {
    const res = PilotDataHarness.processRealFieldDataset(realDataset);
    expect(res.calibrationSplit.every((p) => p.dataMode === "REAL_SENSOR")).toBe(true);
    expect(res.validationSplit.every((p) => p.dataMode === "REAL_SENSOR")).toBe(true);
    expect(res.holdoutSplit.every((p) => p.dataMode === "REAL_SENSOR")).toBe(true);
  });

  test("Test 5: Submitting real physical packet with raw RSSI preserves raw metrics losslessly", () => {
    const res = PilotDataHarness.processFieldObservationPacket(sampleRealPacket);
    expect(res.valid).toBe(true);
    expect(res.packet?.rawPayload.rssiDbm).toBe(-68.4);
    expect(res.packet?.rawPayload.fluxBearingDeg).toBe(42);
  });

  test("Test 6: Packet attempting to set victimProbability returns DERIVED_OUTPUT_READ_ONLY", () => {
    const invalid = { ...sampleRealPacket, victimProbability: 0.92 };
    const res = PilotDataHarness.processFieldObservationPacket(invalid);
    expect(res.valid).toBe(false);
    expect(res.isQuarantined).toBe(true);
    expect(res.errorCode).toBe("DERIVED_OUTPUT_READ_ONLY");
  });

  test("Test 7: Empirical SNR decibel calculation processes real physical signal and noise levels", () => {
    const snr = PilotDataHarness.computeSnrDb(0.82, 0.015); // 10 * log10(0.82 / 0.015) = 17.37 dB
    expect(snr).toBeGreaterThan(15.0);
    expect(snr).toBeLessThan(20.0);
  });

  test("Test 8: Spatial autocorrelation Moran's I evaluates real field coordinate array", () => {
    const coordsX = [10.0, 15.0, 20.0, 25.0, 30.0];
    const coordsY = [5.0, 5.0, 5.0, 5.0, 5.0];
    const vals = [0.82, 0.80, 0.75, 0.20, 0.04];

    const moransI = PilotDataHarness.calculateMoransI(coordsX, coordsY, vals);
    expect(typeof moransI).toBe("number");
    expect(Number.isFinite(moransI)).toBe(true);
  });

  test("Test 9: Sample size calculation computes Phase 7D N_calib based on empirical real variance", () => {
    const nCalib = PilotDataHarness.calculateRequiredSampleSize(0.048, 0.05, 0.05, 0.90);
    expect(nCalib).toBeGreaterThan(50);
    expect(nCalib).toBe(404); // Math.ceil(((1.960 + 1.282)^2 * 2 * 0.048) / 0.0025)
  });


  test("Test 10: Gaussian KDE density calculation evaluates real signal distribution", () => {
    const realSignals = [0.82, 0.79, 0.85, 0.77, 0.81];
    const density = PilotDataHarness.gaussianKernelDensity(0.80, realSignals, 0.1);
    expect(density).toBeGreaterThan(0.0);
  });
});
