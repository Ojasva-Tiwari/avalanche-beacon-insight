import { describe, expect, it } from "bun:test";
import { evaluateZoneWithEngine } from "../../api/mockBackend";
import { computeBayesianUpdate, probabilityToLogOdds } from "../bayesian";
import {
  computeGroupCappedFusion,
  computeSensorLikelihood,
  GROUP_CAPS,
  SENSOR_PRIOR_PARAMS,
} from "../likelihood";
import { computeSearchMetrics } from "../searchModel";
import {
  calculateMultiPassPersistence,
  calculateSurvivalFactor,
} from "../temporal";
import {
  calculateSlopeHazardRisk,
  computeUtility,
} from "../utility";
import { computeZoneDecision, determinePriorityAndAction } from "../index";

describe("Phase 1 Decision Engine — Prototype.md Specification Alignment", () => {
  // 1. Sensor Priors
  it("Correction 1: Sensor priors match fusion_parameters.yaml from Prototype.md", () => {
    expect(SENSOR_PRIOR_PARAMS.rf).toEqual({ tpr: 0.94, fpr: 0.03 });
    expect(SENSOR_PRIOR_PARAMS.recco).toEqual({ tpr: 0.88, fpr: 0.02 });
    expect(SENSOR_PRIOR_PARAMS.mobile_rf).toEqual({ tpr: 0.82, fpr: 0.05 });
    expect(SENSOR_PRIOR_PARAMS.gpr).toEqual({ tpr: 0.89, fpr: 0.08 });
    expect(SENSOR_PRIOR_PARAMS.seismic).toEqual({ tpr: 0.7, fpr: 0.12 });
    expect(SENSOR_PRIOR_PARAMS.acoustic).toEqual({ tpr: 0.7, fpr: 0.12 });
    expect(SENSOR_PRIOR_PARAMS.thermal).toEqual({ tpr: 0.85, fpr: 0.15 });
    expect(SENSOR_PRIOR_PARAMS.rgb).toEqual({ tpr: 0.78, fpr: 0.1 });
  });

  // 2. Missing Sensors
  it("Correction 1/6: Unavailable or offline sensors contribute exactly zero evidence (LR=1.0, ln(LR)=0)", () => {
    const unavail = computeSensorLikelihood("rf", "RF Transceiver", { state: "UNAVAILABLE", evidence: null });
    expect(unavail.isUnavailable).toBe(true);
    expect(unavail.likelihoodRatio).toBe(1.0);
    expect(unavail.logLikelihoodRatio).toBe(0.0);
    expect(unavail.weightedLlr).toBe(0.0);

    const offline = computeSensorLikelihood("thermal", "Thermal UAV", { state: "OFFLINE", evidence: 0.9 });
    expect(offline.isUnavailable).toBe(true);
    expect(offline.weightedLlr).toBe(0.0);
  });

  // 3. Group Caps
  it("Correction 6: Group Capping bounds intra-group LLR confidence inflation", () => {
    // Construct multiple active Group A sensors with high evidence
    const rf = computeSensorLikelihood("rf", "RF", { state: "ACTIVE", evidence: 0.95, signal_quality: 1.0 });
    const recco = computeSensorLikelihood("recco", "RECCO", { state: "ACTIVE", evidence: 0.95, signal_quality: 1.0 });
    const mobileRf = computeSensorLikelihood("mobile_rf", "Mobile RF", { state: "ACTIVE", evidence: 0.95, signal_quality: 1.0 });

    const groupA = [rf, recco, mobileRf];
    const rawSum = groupA.reduce((s, l) => s + l.weightedLlr, 0);

    const fusion = computeGroupCappedFusion(groupA);
    const grpAResult = fusion.groups.find((g) => g.groupId === "GROUP_A_ELECTRONIC");

    expect(grpAResult).toBeDefined();
    expect(rawSum).toBeGreaterThan(GROUP_CAPS.GROUP_A_ELECTRONIC); // Raw sum exceeds cap
    expect(grpAResult!.cappedLlr).toBeCloseTo(GROUP_CAPS.GROUP_A_ELECTRONIC, 4); // Capped at Gamma_A = 4.5
  });

  it("Correction 6: Independent groups contribute independently to total evidence gain", () => {
    const rf = computeSensorLikelihood("rf", "RF", { state: "ACTIVE", evidence: 0.8, signal_quality: 1.0 });
    const gpr = computeSensorLikelihood("gpr", "GPR", { state: "ACTIVE", evidence: 0.8, signal_quality: 1.0 });

    const fusion = computeGroupCappedFusion([rf, gpr]);

    const grpA = fusion.groups.find((g) => g.groupId === "GROUP_A_ELECTRONIC")!;
    const grpB = fusion.groups.find((g) => g.groupId === "GROUP_B_SUBSURFACE")!;

    expect(grpA.effectiveContribution).toBeGreaterThan(0);
    expect(grpB.effectiveContribution).toBeGreaterThan(0);
    expect(fusion.totalEvidenceLogOddsGain).toBeCloseTo(grpA.effectiveContribution + grpB.effectiveContribution, 4);
  });

  // 4. Survival Phase 1
  it("Correction 2: Survival Phase 1 (t <= 15 min) returns S = 0.92", () => {
    expect(calculateSurvivalFactor(0)).toBeCloseTo(0.92, 4);
    expect(calculateSurvivalFactor(10)).toBeCloseTo(0.92, 4);
    expect(calculateSurvivalFactor(15)).toBeCloseTo(0.92, 4);
  });

  // 5. Survival Phase 2
  it("Correction 2: Survival Phase 2 (15 < t <= 35 min) follows linear drop formula", () => {
    // t = 25 min, rho = 350 -> dt = 10/20 = 0.5, densityFactor = 1 + 350/500 = 1.7
    // S = 0.92 - 0.65 * 0.5 * 1.7 = 0.92 - 0.5525 = 0.3675
    const s25 = calculateSurvivalFactor(25, 350);
    expect(s25).toBeCloseTo(0.3675, 4);
  });

  // 6. Survival Phase 3
  it("Correction 2: Survival Phase 3 (35 < t <= 120 min) follows 45-min half-life exponential decay", () => {
    // At t = 35 min: S = 0.27 * exp(0) = 0.27
    const s35 = calculateSurvivalFactor(35.0001);
    expect(s35).toBeCloseTo(0.27, 2);

    // At t = 35 + 45 = 80 min (one half-life): S = 0.27 / 2 = 0.135
    const s80 = calculateSurvivalFactor(80);
    expect(s80).toBeCloseTo(0.135, 3);
  });

  // 7. Survival Floor
  it("Correction 2: Survival Phase 4 (t > 120 min) returns baseline floor 0.03", () => {
    expect(calculateSurvivalFactor(121)).toBeCloseTo(0.03, 4);
    expect(calculateSurvivalFactor(300)).toBeCloseTo(0.03, 4);
  });

  // 8. Snow-Density Effect
  it("Correction 2: Higher snow density accelerates survival drop in Phase 2", () => {
    const sLightSnow = calculateSurvivalFactor(25, 150); // High porosity
    const sDenseSnow = calculateSurvivalFactor(25, 500); // Low porosity slab

    expect(sLightSnow).toBeGreaterThan(sDenseSnow);
  });

  // 9. Slope Hazard Risk Boundaries
  it("Correction 3: Slope Hazard Risk R_hazard(theta) satisfies exact piecewise boundaries", () => {
    // theta < 25 deg -> 1.0
    expect(calculateSlopeHazardRisk(24.9)).toBe(1.0);
    expect(calculateSlopeHazardRisk(25.0)).toBe(1.0);

    // theta = 30 deg -> 1.0 + 3.5 * sin^2(2 * 5 deg = 10 deg) = 1.0 + 3.5 * sin^2(10 deg)
    const r30 = calculateSlopeHazardRisk(30.0);
    const expected30 = 1.0 + 3.5 * Math.pow(Math.sin((10 * Math.PI) / 180), 2);
    expect(r30).toBeCloseTo(expected30, 4);

    // theta = 40 deg -> 1.0 + 3.5 * sin^2(2 * 15 deg = 30 deg) = 1.0 + 3.5 * (0.5)^2 = 1.0 + 0.875 = 1.875
    expect(calculateSlopeHazardRisk(40.0)).toBeCloseTo(1.875, 4);

    // theta = 45 deg -> 1.0 + 3.5 * sin^2(2 * 20 deg = 40 deg)
    const r45 = calculateSlopeHazardRisk(45.0);
    const expected45 = 1.0 + 3.5 * Math.pow(Math.sin((40 * Math.PI) / 180), 2);
    expect(r45).toBeCloseTo(expected45, 4);

    // theta > 45 deg -> 2.0
    expect(calculateSlopeHazardRisk(45.1)).toBe(2.0);
    expect(calculateSlopeHazardRisk(60.0)).toBe(2.0);
  });

  // 10. Utility Using Raw Bayesian Probability
  it("Correction 5: Utility numerator uses raw Bayesian victim probability P(H_i), NOT P_eff", () => {
    const rawProbability = 0.80;
    const survivalFactor = 0.92;

    const utilityResult = computeUtility({
      victimProbability: rawProbability,
      survivalFactor,
      distanceMeters: 100,
      burialDepthMeters: 1.0,
      slopeAngleDegrees: 20,
    });

    const expectedGain = rawProbability * survivalFactor;
    expect(utilityResult.expectedSurvivalGain).toBeCloseTo(expectedGain, 4);
  });

  // 11. POA / POD / POS Remaining Separate
  it("Correction 5: Search theory metrics (POA, POD, POS, POA_eff) remain distinct from raw Bayesian probability", () => {
    const pBayes = 0.70;
    const cumPod = 0.60;

    const metrics = computeSearchMetrics(pBayes, [0.9], cumPod);

    expect(metrics.poa).toBe(pBayes);
    expect(metrics.cumulativePod).toBe(cumPod);
    expect(metrics.pos).toBeCloseTo(metrics.remainingPoa * metrics.pod, 4);
    expect(metrics.remainingPoa).toBeCloseTo(pBayes * (1 - cumPod), 4);
  });

  // 12. Triage Thresholds
  it("Correction 4: Operational triage thresholds match Prototype.md Section 1.3.4", () => {
    // P3: prob < 0.45
    expect(determinePriorityAndAction(0.4499)).toEqual({
      priority: "P3",
      recommendedAction: "DEFER",
    });

    // P2: 0.45 <= prob < 0.85
    expect(determinePriorityAndAction(0.45)).toEqual({
      priority: "P2",
      recommendedAction: "SECONDARY_SENSOR_SCAN",
    });

    expect(determinePriorityAndAction(0.8499)).toEqual({
      priority: "P2",
      recommendedAction: "SECONDARY_SENSOR_SCAN",
    });

    // P1: prob >= 0.85
    expect(determinePriorityAndAction(0.85)).toEqual({
      priority: "P1",
      recommendedAction: "PINPOINT_AND_PROBE",
    });

    expect(determinePriorityAndAction(0.95)).toEqual({
      priority: "P1",
      recommendedAction: "PINPOINT_AND_PROBE",
    });
  });

  // 13. Multi-Pass Temporal Behavior
  it("Correction 7: Multi-pass persistence filter gives bonus when signals persist across passes", () => {
    // Passes with high detections -> ratio = 1.0 -> bonus = 0.8 * (1.0 - 0.35) = +0.52
    const persistent = calculateMultiPassPersistence([2.0, 1.5, 3.0]);
    expect(persistent.isBonus).toBe(true);
    expect(persistent.temporalTerm).toBeCloseTo(0.52, 4);

    // Passes with zero detections -> ratio = 0.0 -> penalty = 0.8 * (0 - 0.35) = -0.28
    const transient = calculateMultiPassPersistence([0.1, 0.2, 0.0]);
    expect(transient.isBonus).toBe(false);
    expect(transient.temporalTerm).toBeCloseTo(-0.28, 4);
  });

  // 14. Deterministic Ranking
  it("Correction 8: Deterministic decision pipeline ranks zones correctly based on evidence", () => {
    const highEvZone = computeZoneDecision({
      zoneId: "B2",
      priorProbability: 0.25,
      evidences: {
        rf: { state: "ACTIVE", evidence: 0.95, signal_quality: 1.0 },
        gpr: { state: "ACTIVE", evidence: 0.85, signal_quality: 0.9 },
      },
      elapsedMinutes: 10,
    });

    const lowEvZone = computeZoneDecision({
      zoneId: "A1",
      priorProbability: 0.02,
      evidences: {
        rf: { state: "UNAVAILABLE", evidence: null },
      },
      elapsedMinutes: 10,
    });

    expect(highEvZone.bayesian.probability).toBeGreaterThan(lowEvZone.bayesian.probability);
    expect(highEvZone.utility.utilityScore).toBeGreaterThan(lowEvZone.utility.utilityScore);
    expect(highEvZone.priority).toBe("P1");
    expect(lowEvZone.priority).toBe("P3");
  });

  // 15. Existing Scenarios Still Execute
  it("Correction 8: Existing mock scenario pipeline executes cleanly with updated engine", () => {
    const baseResult = evaluateZoneWithEngine("BASE_GPR", "B2");
    expect(baseResult.zoneId).toBe("B2");
    expect(baseResult.bayesian.probability).toBeGreaterThan(0.01);
    expect(baseResult.explanations.length).toBeGreaterThan(0);
  });
});
