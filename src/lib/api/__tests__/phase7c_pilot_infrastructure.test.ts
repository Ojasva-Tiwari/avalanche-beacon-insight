import { describe, expect, test } from "bun:test";
import { PilotDataHarness } from "../pilotDataHarness";
import type { FieldObservationPacket } from "@/lib/types";

describe("Phase 7C — Pilot Data Infrastructure & Statistical Analysis Harness", () => {
  const validPacket: FieldObservationPacket = {
    experimentId: "EXP-PILOT-7C-01",
    sensorSerialId: "SN-457-ALPHA",
    modality: "RF",
    timestampIso: new Date().toISOString(),
    rtkGps: {
      lat: 34.1839,
      lon: 77.5621,
      altM: 3250.5,
      hAccM: 0.012, // 1.2cm accuracy <= 0.05m
      vAccM: 0.018,
    },
    snowpack: {
      densityKgM3: 320.0,
      lwcPercent: 2.5,
      tempC: -8.5,
    },
    rawPayload: {
      rssiDbm: -72.5,
      batteryV: 12.6,
      rawSignalPowerV: 0.45,
      backgroundNoiseV: 0.02,
    },
    groundTruth: {
      targetPresent: true,
      targetId: "TGT-REF-101",
      depthM: 1.2,
      orientationDeg: 45,
    },
    dataMode: "SYNTHETIC",
  };

  test("Test 1: Valid Phase 7B observation packet is successfully ingested and WORM tagged", () => {
    const res = PilotDataHarness.processFieldObservationPacket(validPacket);
    expect(res.valid).toBe(true);
    expect(res.isQuarantined).toBe(false);
    expect(res.packet).toBeDefined();
    expect(res.payloadHash).toBeDefined();
    expect(res.payloadHash!.length).toBe(64); // SHA-256 hex length
    expect(res.wormTag).toContain("WORM-EXP-PILOT-7C-01-SN-457-ALPHA-");
    expect(res.packet?.dataMode).toBe("SYNTHETIC");
  });

  test("Test 2: Missing mandatory field (rtkGps) is rejected with MISSING_REQUIRED_FIELD", () => {
    const invalid = { ...validPacket, rtkGps: undefined };
    const res = PilotDataHarness.processFieldObservationPacket(invalid);
    expect(res.valid).toBe(false);
    expect(res.isQuarantined).toBe(true);
    expect(res.errorCode).toBe("MISSING_REQUIRED_FIELD");
  });

  test("Test 3: RTK-GPS accuracy > 0.05m (e.g. 0.12m = 12cm) is rejected with GPS_ACCURACY_TOO_LOW", () => {
    const lowAcc = {
      ...validPacket,
      rtkGps: { ...validPacket.rtkGps, hAccM: 0.12 },
    };
    const res = PilotDataHarness.processFieldObservationPacket(lowAcc);
    expect(res.valid).toBe(false);
    expect(res.isQuarantined).toBe(true);
    expect(res.errorCode).toBe("GPS_ACCURACY_TOO_LOW");
  });

  test("Test 4: Snowpack density out of physical bounds (800 kg/m3) returns SNOWPACK_BOUNDS_EXCEEDED", () => {
    const badSnow = {
      ...validPacket,
      snowpack: { ...validPacket.snowpack, densityKgM3: 800.0 },
    };
    const res = PilotDataHarness.processFieldObservationPacket(badSnow);
    expect(res.valid).toBe(false);
    expect(res.isQuarantined).toBe(true);
    expect(res.errorCode).toBe("SNOWPACK_BOUNDS_EXCEEDED");
  });

  test("Test 5: Ground truth target present with negative depth returns INVALID_GROUND_TRUTH_DEPTH", () => {
    const badGt = {
      ...validPacket,
      groundTruth: { targetPresent: true, depthM: -0.5 },
    };
    const res = PilotDataHarness.processFieldObservationPacket(badGt);
    expect(res.valid).toBe(false);
    expect(res.isQuarantined).toBe(true);
    expect(res.errorCode).toBe("INVALID_GROUND_TRUTH_DEPTH");
  });

  test("Test 6: Packet attempting to write derived outputs returns DERIVED_OUTPUT_READ_ONLY", () => {
    const derivedHack = {
      ...validPacket,
      victimProbability: 0.95,
    };
    const res = PilotDataHarness.processFieldObservationPacket(derivedHack);
    expect(res.valid).toBe(false);
    expect(res.isQuarantined).toBe(true);
    expect(res.errorCode).toBe("DERIVED_OUTPUT_READ_ONLY");
  });

  test("Test 7: Future timestamp beyond 300s clock skew returns TIMESTAMP_FUTURE_CLOCK_SKEW", () => {
    const futureTime = new Date(Date.now() + 600000).toISOString();
    const future = { ...validPacket, timestampIso: futureTime };
    const res = PilotDataHarness.processFieldObservationPacket(future);
    expect(res.valid).toBe(false);
    expect(res.isQuarantined).toBe(true);
    expect(res.errorCode).toBe("TIMESTAMP_FUTURE_CLOCK_SKEW");
  });

  test("Test 8: Analytical SNR computation computes correct decibel ratio", () => {
    const snrHigh = PilotDataHarness.computeSnrDb(1.0, 0.01); // 10 * log10(100) = 20 dB
    expect(Math.abs(snrHigh - 20.0)).toBeLessThan(0.001);

    const snrLow = PilotDataHarness.computeSnrDb(0.01, 0.01); // 10 * log10(1) = 0 dB
    expect(Math.abs(snrLow - 0.0)).toBeLessThan(0.001);
  });

  test("Test 9: Moran's I spatial autocorrelation computes spatial lag statistic", () => {
    const coordsX = [0, 5, 10, 15, 20];
    const coordsY = [0, 0, 0, 0, 0];
    const vals = [1.0, 1.2, 1.1, 0.9, 1.0];

    const moransI = PilotDataHarness.calculateMoransI(coordsX, coordsY, vals);
    expect(typeof moransI).toBe("number");
    expect(Number.isFinite(moransI)).toBe(true);
  });

  test("Test 10: Statistical sample size calculation computes N_calib based on empirical variance", () => {
    const nCalib = PilotDataHarness.calculateRequiredSampleSize(0.05, 0.05, 0.05, 0.90);
    expect(nCalib).toBeGreaterThan(50);
    expect(nCalib).toBe(421); // Exact formula calculation
  });

  test("Test 11: Gaussian KDE evaluation computes positive density", () => {
    const sampleData = [0.2, 0.3, 0.25, 0.28, 0.32];
    const density = PilotDataHarness.gaussianKernelDensity(0.25, sampleData, 0.1);
    expect(density).toBeGreaterThan(0.0);
  });

  test("Test 12: Ingested packet explicitly retains dataMode as SYNTHETIC", () => {
    const res = PilotDataHarness.processFieldObservationPacket(validPacket);
    expect(res.valid).toBe(true);
    expect(res.packet?.dataMode).toBe("SYNTHETIC");
  });
});
