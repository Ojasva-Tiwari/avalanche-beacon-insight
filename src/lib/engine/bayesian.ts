/**
 * Recursive Bayesian Log-Odds Fusion Engine
 * SOURCE OF TRUTH: docs/Prototype.md Section 1.2.5 & docs/System Design.md
 */

export interface BayesianState {
  logOdds: number; // L(i,t)
  probability: number; // P(i,t) = sigmoid(L(i,t))
  priorLogOdds: number; // L(i,0)
  priorProbability: number; // P(i,0)
  evidenceLogOddsGain: number; // Delta L_evidence (Group-Capped)
  temporalTerm: number; // C_temporal(i,t) - Multi-pass persistence term
}

const EPSILON = 1e-6;

/** Converts probability P in [0, 1] to Log-Odds L */
export function probabilityToLogOdds(p: number): number {
  const clamped = Math.min(1 - EPSILON, Math.max(EPSILON, p));
  return Math.log(clamped / (1 - clamped));
}

/** Converts Log-Odds L to probability P in [0, 1] via Sigmoid */
export function logOddsToProbability(l: number): number {
  // Prevent exponential overflow
  if (l > 40) return 1 - EPSILON;
  if (l < -40) return EPSILON;
  return 1 / (1 + Math.exp(-l));
}

/**
 * Executes Recursive Bayesian Log-Odds Fusion:
 * SOURCE: docs/Prototype.md Section 1.2.5 Equation 5
 *
 * L_t(i) = L_{t-1}(i) + Sum_{g in {A,B,C}} w_g * Lambda_{g,t}(i) + C_temporal(i,t)
 * P(H_i | Z_{1:t}) = 1 / (1 + exp(-L_t(i)))
 */
export function computeBayesianUpdate(
  priorProbability: number,
  evidenceLogOddsGain: number,
  temporalTerm: number = 0,
  previousLogOdds?: number,
): BayesianState {
  const priorL = probabilityToLogOdds(priorProbability);
  const baseL = previousLogOdds !== undefined ? previousLogOdds : priorL;

  const updatedL = baseL + evidenceLogOddsGain + temporalTerm;
  const updatedP = logOddsToProbability(updatedL);

  return {
    logOdds: updatedL,
    probability: updatedP,
    priorLogOdds: priorL,
    priorProbability,
    evidenceLogOddsGain,
    temporalTerm,
  };
}
