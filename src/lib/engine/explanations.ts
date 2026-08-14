import type { BayesianState } from "./bayesian";
import type { LikelihoodResult } from "./likelihood";
import type { SearchModelMetrics } from "./searchModel";
import type { UtilityBreakdown } from "./utility";

export interface ExplanationItem {
  kind: "SUPPORT" | "CAUTION";
  text: string;
}

export function generateDeterministicExplanations(
  bayesian: BayesianState,
  likelihoods: LikelihoodResult[],
  searchMetrics?: SearchModelMetrics | undefined,
  utility?: UtilityBreakdown | undefined,
  context?: { inAvalanchePath?: boolean; depthM?: number | null } | undefined,
): ExplanationItem[] {
  const explanations: ExplanationItem[] = [];

  // 1. Sensor Likelihood & Missing Sensor Explanations
  for (const l of likelihoods) {
    if (l.isUnavailable) {
      explanations.push({
        kind: "CAUTION",
        text: `${l.label} is unavailable; contributed zero evidence (LR=1.0).`,
      });
    } else if (l.reliabilityWeight < 0.5 && l.evidenceValue !== null && l.evidenceValue > 0.3) {
      explanations.push({
        kind: "CAUTION",
        text: `${l.label} signal is degraded by environmental conditions or interference (weight=${l.reliabilityWeight.toFixed(2)}).`,
      });
    } else if (l.weightedLlr > 0.4) {
      explanations.push({
        kind: "SUPPORT",
        text: `Strong ${l.label} signal (LR=${l.likelihoodRatio.toFixed(1)}, weight=${l.reliabilityWeight.toFixed(2)}) increased victim probability.`,
      });
    } else if (l.weightedLlr < -0.3) {
      explanations.push({
        kind: "CAUTION",
        text: `Low ${l.label} signal reduced victim belief.`,
      });
    }
  }

  // 2. Prior & Avalanche Deposition Path
  if (context?.inAvalanchePath) {
    explanations.push({
      kind: "SUPPORT",
      text: "Cell scored from contextual avalanche deposition flow model prior.",
    });
  }

  // 3. Search Coverage Reduction
  if (searchMetrics && searchMetrics.cumulativePod > 0.3) {
    explanations.push({
      kind: "CAUTION",
      text: `Prior search sweep (POD=${Math.round(searchMetrics.cumulativePod * 100)}%) reduced unsearched cell priority.`,
    });
  }

  // 4. Terrain & Excavation Utility Factors
  if (utility) {
    if (utility.slopeHazardRisk > 1.5) {
      explanations.push({
        kind: "CAUTION",
        text: `High slope terrain hazard (R=${utility.slopeHazardRisk.toFixed(1)}) reduces SAR search utility.`,
      });
    }
    if (utility.excavationCost > 4.0 && context?.depthM) {
      explanations.push({
        kind: "CAUTION",
        text: `Deep burial (${context.depthM.toFixed(1)}m) increases excavation effort, lowering utility score.`,
      });
    }
    if (utility.traverseCost < 2.0) {
      explanations.push({
        kind: "SUPPORT",
        text: "Short traversal distance from rescuer base increases operational utility.",
      });
    }
  }

  // Fallback if empty
  if (explanations.length === 0) {
    if (bayesian.probability > 0.4) {
      explanations.push({
        kind: "SUPPORT",
        text: "Moderate background evidence supports searching this cell.",
      });
    } else {
      explanations.push({
        kind: "CAUTION",
        text: "No confirming sensor evidence in this cell.",
      });
    }
  }

  return explanations;
}
