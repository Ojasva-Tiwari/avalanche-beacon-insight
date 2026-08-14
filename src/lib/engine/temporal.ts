/**
 * Temporal Persistence & Survival Models
 * SOURCE OF TRUTH: docs/Prototype.md Sections 1.2.4 & 1.3.1
 */

export interface TemporalPersistenceResult {
  temporalTerm: number; // C_temporal(i,t) - ADDED to log-odds state
  passCount: number;
  persistenceRatio: number;
  isBonus: boolean;
}

/**
 * Default multi-pass temporal persistence parameters from Prototype.md Section 3.1
 */
export interface TemporalPersistenceParams {
  windowPasses: number; // K = 3
  persistenceBonus: number; // lambda_persist = 0.8
  decayPenalty: number; // delta_decay = 0.35
  detectionThreshold: number; // tau_det = 0.5
}

export const DEFAULT_TEMPORAL_PARAMS: TemporalPersistenceParams = {
  windowPasses: 3,
  persistenceBonus: 0.8,
  decayPenalty: 0.35,
  detectionThreshold: 0.5,
};

/**
 * Calculates Multi-Pass Persistence Term C_temporal(i,t) (docs/Prototype.md Section 1.2.4)
 * C_temporal(i,t) = lambda_persist * [ (Sum_{k=0}^{K-1} I(Lambda > tau_det)) / K - delta_decay ]
 *
 * NOTE ON SIGN & MATHEMATICAL INTEGRATION:
 * Per Prototype.md Section 1.2.5 Equation 5, C_temporal is ADDED (+) to log-odds state:
 * L_t(i) = L_{t-1}(i) + Sum(w_g * Lambda_g) + C_temporal(i,t).
 * If signals persist across K passes, C_temporal > 0 (persistence bonus).
 * If signals are transient/noise, C_temporal < 0 (transient penalty).
 */
export function calculateMultiPassPersistence(
  recentPassLogOdds: number[],
  params: TemporalPersistenceParams = DEFAULT_TEMPORAL_PARAMS,
): TemporalPersistenceResult {
  const K = Math.max(1, params.windowPasses);
  const passes = recentPassLogOdds.slice(-K);
  const detectedPasses = passes.filter((llr) => llr > params.detectionThreshold).length;

  const ratio = detectedPasses / K;
  const temporalTerm = params.persistenceBonus * (ratio - params.decayPenalty);

  return {
    temporalTerm,
    passCount: passes.length,
    persistenceRatio: ratio,
    isBonus: temporalTerm >= 0,
  };
}

/**
 * Survival Model Parameters from Prototype.md Section 3.1
 * - phase3_hypo_halflife_minutes: 45.0 min -> lambda_hypo = ln(2) / 45.0 ~= 0.01540327
 */
export interface SurvivalModelParams {
  phase1MaxMinutes: number; // 15.0 min
  phase1SurvivalRate: number; // 0.92
  phase2MaxMinutes: number; // 35.0 min
  phase2DropRate: number; // 0.65
  phase3HypoHalflifeMinutes: number; // 45.0 min
  baselineMinimumSurvival: number; // 0.03
}

export const DEFAULT_SURVIVAL_PARAMS: SurvivalModelParams = {
  phase1MaxMinutes: 15.0,
  phase1SurvivalRate: 0.92,
  phase2MaxMinutes: 35.0,
  phase2DropRate: 0.65,
  phase3HypoHalflifeMinutes: 45.0,
  baselineMinimumSurvival: 0.03,
};

/**
 * Calculates victim survival probability S(t_elapsed, rho_snow)
 * SOURCE: docs/Prototype.md Section 1.3.1
 *
 * Phase 1 (t <= 15 min): S = 0.92
 * Phase 2 (15 < t <= 35 min): S = 0.92 - 0.65 * ((t - 15) / 20) * (1 + rho_snow / 500)
 * Phase 3 (35 < t <= 120 min): S = 0.27 * exp(-lambda_hypo * (t - 35))
 * Phase 4 (t > 120 min): S = 0.03
 *
 * Result is clamped strictly to [0, 1].
 */
export function calculateSurvivalFactor(
  elapsedMinutes: number,
  snowDensityKgM3: number = 350,
  params: SurvivalModelParams = DEFAULT_SURVIVAL_PARAMS,
): number {
  const t = Math.max(0, elapsedMinutes);
  let s: number;

  if (t <= params.phase1MaxMinutes) {
    s = params.phase1SurvivalRate; // 0.92
  } else if (t <= params.phase2MaxMinutes) {
    const dtPhase2 = (t - params.phase1MaxMinutes) / (params.phase2MaxMinutes - params.phase1MaxMinutes);
    const densityFactor = 1.0 + Math.max(0, snowDensityKgM3) / 500.0;
    s = params.phase1SurvivalRate - params.phase2DropRate * dtPhase2 * densityFactor;
  } else if (t <= 120) {
    const lambdaHypo = Math.log(2) / params.phase3HypoHalflifeMinutes; // Derived from 45 min halflife
    s = 0.27 * Math.exp(-lambdaHypo * (t - params.phase2MaxMinutes));
  } else {
    s = params.baselineMinimumSurvival; // 0.03
  }

  return Math.min(1.0, Math.max(0.0, s));
}
