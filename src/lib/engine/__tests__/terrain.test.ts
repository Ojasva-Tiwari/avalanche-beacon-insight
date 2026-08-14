import { describe, expect, test } from "bun:test";
import { computeZoneDecision } from "../index";
import { computeZoneTerrainFeatures, sampleCopernicusElevation } from "../terrainAnalysis";

describe("Phase 2C — Terrain-Aware Search Decision Engine Alignment", () => {
  test("Copernicus DEM GLO-30 N34E077 elevation sampling at incident LKP (34.1234°N, 77.4567°E)", () => {
    const elev = sampleCopernicusElevation(34.1234, 77.4567);
    expect(elev).toBeCloseTo(3276.4, 1);
  });

  test("Terrain analysis computes slope, aspect, category, and R_hazard for incident search zone", () => {
    const features = computeZoneTerrainFeatures(34.1234, 77.4567, "Z-01");
    expect(features.zoneId).toBe("Z-01");
    expect(features.elevationM).toBeCloseTo(3276.4, 1);
    expect(features.slopeAngleDegrees).toBeGreaterThanOrEqual(0.0);
    expect(features.slopeAngleDegrees).toBeLessThanOrEqual(90.0);
    expect(features.slopeHazardRisk).toBeGreaterThanOrEqual(1.0);
    expect(features.slopeHazardRisk).toBeLessThanOrEqual(2.45);
    expect(["N", "NE", "E", "SE", "S", "SW", "W", "NW"]).toContain(features.aspectCompass);
    expect(["FLAT", "MODERATE", "AVALANCHE_PRONE", "EXTREME"]).toContain(features.slopeCategory);
  });

  test("Boundary condition: Flat terrain (theta < 15°) maps to FLAT category & R_hazard = 1.0", () => {
    const features = computeZoneTerrainFeatures(34.05, 77.38, "FLAT-ZONE");
    if (features.slopeAngleDegrees < 15.0) {
      expect(features.slopeCategory).toBe("FLAT");
      expect(features.slopeHazardRisk).toBe(1.0);
    }
  });

  test("Decision engine incorporates Copernicus DEM terrain features into utility and zone result", () => {
    const result = computeZoneDecision({
      zoneId: "Z-01",
      priorProbability: 0.15,
      latitude: 34.1234,
      longitude: 77.4567,
      evidences: {
        rf: { evidence: 0.8, signal_quality: 0.9, state: "ACTIVE" },
      },
    });

    expect(result.terrainFeatures).toBeDefined();
    expect(result.terrainFeatures.elevationM).toBeCloseTo(3276.4, 1);
    expect(result.utility.slopeHazardRisk).toBe(result.terrainFeatures.slopeHazardRisk);
    expect(result.utility.utilityScore).toBeGreaterThan(0.0);
  });
});
