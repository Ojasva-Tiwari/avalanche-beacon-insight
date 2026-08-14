export interface SearchModelMetrics {
  poa: number; // Probability of Area (Bayesian victim probability)
  pod: number; // Current Probability of Detection from sensor sweep
  pos: number; // Probability of Success = POA * POD
  cumulativePod: number; // Historical accumulated search coverage in this zone
  remainingPoa: number; // Effective unsearched victim probability = POA * (1 - cumulativePod)
}

/**
 * Calculates Search Theory metrics: POA, POD, POS, and search-coverage reduction.
 *
 * @param bayesianProbability - Spatial victim probability P(i,t)
 * @param sensorReliabilityWeights - List of active sensor reliability weights in the cell
 * @param cumulativePod - Historical accumulated search coverage [0, 1] for deprioritization
 */
export function computeSearchMetrics(
  bayesianProbability: number,
  sensorReliabilityWeights: number[],
  cumulativePod: number = 0,
): SearchModelMetrics {
  const poa = Math.min(1.0, Math.max(0.0, bayesianProbability));
  const cumPod = Math.min(0.99, Math.max(0.0, cumulativePod));

  // Estimate current POD based on combined sensor coverage in this sweep
  // POD = 1 - exp(- Sum(alpha_s))
  const totalCoverageEffort = sensorReliabilityWeights.reduce((sum, w) => sum + w, 0);
  const currentPod = Math.min(0.95, 1 - Math.exp(-0.8 * totalCoverageEffort));

  // Effective remaining POA after accounting for prior search coverage
  const remainingPoa = poa * (1.0 - cumPod);

  // Probability of Success for a search action in this cell
  const pos = remainingPoa * currentPod;

  return {
    poa,
    pod: currentPod,
    pos,
    cumulativePod: cumPod,
    remainingPoa,
  };
}
