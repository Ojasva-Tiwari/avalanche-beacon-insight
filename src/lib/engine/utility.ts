/**
 * SAR Spatiotemporal Utility Maximization Engine
 * SOURCE OF TRUTH: docs/Prototype.md Section 1.3.2
 *
 * PROTOTYPE UTILITY MODELING & SCALING NOTICE:
 * 1. This module implements the exact prototype utility formulation specified by docs/Prototype.md:
 *    U(i,t) = [ P(H_i) * S(t_elapsed) ] / [ E_traverse(i) + E_excavate(d_i) + R_hazard(theta_i) ]
 * 2. E_traverse, E_excavate, and R_hazard currently retain the prototype's specified formulation/scaling.
 * 3. The model has NOT been empirically calibrated for real-world rescue operations.
 * 4. No normalization weights or artificial calibration constants have been invented or added.
 * 5. This dimensional/scaling limitation is explicitly documented as a prototype limitation and has NOT
 *    been mathematically "solved" or modified in code. Future operational deployment would require empirical
 *    validation/calibration of the utility cost scaling using appropriate field and operational SAR data.
 */

export interface UtilityInput {
  victimProbability: number; // P(H_i) - RAW Bayesian probability (Correction 5)
  survivalFactor: number; // S(t_elapsed) - Victim survival factor [0, 1]
  distanceMeters: number; // Distance from rescuer/base to cell
  burialDepthMeters: number; // Estimated burial depth d_i
  slopeAngleDegrees: number; // Terrain slope angle theta_i
  traverseVelocityMetersPerSec?: number; // v_traverse (default 0.8 m/s)
}

export interface UtilityBreakdown {
  utilityScore: number; // U(i,t)
  expectedSurvivalGain: number; // P(H_i) * S(t_elapsed) [NUMERATOR]
  traverseCost: number; // E_traverse(i)
  excavationCost: number; // E_excavate(d_i)
  slopeHazardRisk: number; // R_hazard(theta_i) [1.0 <= R_hazard <= 2.4461]
  totalCostDenominator: number; // E_traverse + E_excavate + R_hazard
}

/**
 * Calculates Slope Hazard Risk R_hazard(theta)
 * SOURCE: docs/Prototype.md Section 1.3.2
 *
 * Range: 1.0 <= R_hazard <= 2.4461
 * For theta < 25 deg: R_hazard = 1.0
 * For 25 <= theta <= 45 deg: R_hazard = 1.0 + 3.5 * sin^2(2 * (theta - 25 deg)) [Max = 2.4461 at theta = 45 deg]
 * For theta > 45 deg: R_hazard = 2.0
 */
export function calculateSlopeHazardRisk(slopeAngleDegrees: number): number {
  const theta = slopeAngleDegrees;

  if (theta < 25.0) {
    return 1.0;
  }

  if (theta > 45.0) {
    return 2.0;
  }

  // 25 deg <= theta <= 45 deg
  const deltaDegrees = theta - 25.0;
  const doubleAngleRad = (2.0 * deltaDegrees * Math.PI) / 180.0;
  const sinVal = Math.sin(doubleAngleRad);
  const sinSq = sinVal * sinVal;

  return 1.0 + 3.5 * sinSq;
}

/**
 * Calculates Excavation Energy/Time Cost E_excavate(d_i)
 * E_excavate = 1.2 * d_i^1.8
 */
export function calculateExcavationCost(burialDepthMeters: number): number {
  const d = Math.max(0.1, burialDepthMeters);
  return 1.2 * Math.pow(d, 1.8);
}

/**
 * Calculates Traversal Time/Energy Cost E_traverse(i)
 * E_traverse = distance / (v_traverse * cos(theta))
 */
export function calculateTraverseCost(
  distanceMeters: number,
  slopeAngleDegrees: number,
  traverseVelocityMetersPerSec: number = 0.8,
): number {
  const dist = Math.max(0, distanceMeters);
  const rad = (Math.min(80, Math.max(0, slopeAngleDegrees)) * Math.PI) / 180.0;
  const cosFactor = Math.max(0.2, Math.cos(rad));
  const effectiveSpeed = Math.max(0.1, traverseVelocityMetersPerSec * cosFactor);

  return dist / (effectiveSpeed * 60.0); // Converted to minutes effort metric
}

/**
 * Calculates SAR Spatiotemporal Utility U(i,t)
 * SOURCE: docs/Prototype.md Section 1.3.2
 *
 * U(i,t) = [ P(H_i | Z_{1:t}) * S(t_elapsed) ] / [ E_traverse(i) + E_excavate(d_i) + R_hazard(theta_i) ]
 *
 * CRITICAL (Correction 5): The numerator MUST use the raw Bayesian probability P(H_i),
 * NOT P_eff = P(H_i) * (1 - cumPOD).
 */
export function computeUtility(input: UtilityInput): UtilityBreakdown {
  const pBayes = Math.min(1.0, Math.max(0.0, input.victimProbability));
  const sFactor = Math.min(1.0, Math.max(0.0, input.survivalFactor));

  // Numerator: Raw Bayesian victim probability * survival rate
  const expectedSurvivalGain = pBayes * sFactor;

  const traverseCost = calculateTraverseCost(
    input.distanceMeters,
    input.slopeAngleDegrees,
    input.traverseVelocityMetersPerSec,
  );
  const excavationCost = calculateExcavationCost(input.burialDepthMeters);
  const slopeHazardRisk = calculateSlopeHazardRisk(input.slopeAngleDegrees);

  const totalCostDenominator = traverseCost + excavationCost + slopeHazardRisk;
  const utilityScore = totalCostDenominator > 0 ? expectedSurvivalGain / totalCostDenominator : 0;

  return {
    utilityScore,
    expectedSurvivalGain,
    traverseCost,
    excavationCost,
    slopeHazardRisk,
    totalCostDenominator,
  };
}
