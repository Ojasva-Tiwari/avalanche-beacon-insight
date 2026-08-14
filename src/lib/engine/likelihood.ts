import type { SensorEvidence, SensorId, SensorState } from "@/lib/types";

/**
 * Sensor Observation Parameters P(z|H) and P(z|~H)
 * SOURCE: docs/Prototype.md Section 3.1 (config/fusion_parameters.yaml)
 * NOTE: These are prototype/configuration calibration parameters, not field-validated statistics.
 */
export interface SensorModelParams {
  tpr: number; // P(z | H) - Probability of observation given victim present
  fpr: number; // P(z | ~H) - Probability of observation given no victim present
}

export const SENSOR_PRIOR_PARAMS: Record<SensorId, SensorModelParams> = {
  rf: { tpr: 0.94, fpr: 0.03 }, // Transceiver 457 kHz
  recco: { tpr: 0.88, fpr: 0.02 }, // RECCO Harmonic Radar
  mobile_rf: { tpr: 0.82, fpr: 0.05 }, // Mobile RF / IMSI
  gpr: { tpr: 0.89, fpr: 0.08 }, // Ground Penetrating Radar
  seismic: { tpr: 0.7, fpr: 0.12 }, // Micro-seismic geophone array
  acoustic: { tpr: 0.7, fpr: 0.12 }, // Acoustic array
  thermal: { tpr: 0.85, fpr: 0.15 }, // Thermal IR UAV
  rgb: { tpr: 0.78, fpr: 0.1 }, // Visual RGB UAV
};

export type SensorGroupId = "GROUP_A_ELECTRONIC" | "GROUP_B_SUBSURFACE" | "GROUP_C_SURFACE";

export const SENSOR_GROUP_MAP: Record<SensorId, SensorGroupId> = {
  rf: "GROUP_A_ELECTRONIC",
  recco: "GROUP_A_ELECTRONIC",
  mobile_rf: "GROUP_A_ELECTRONIC",
  gpr: "GROUP_B_SUBSURFACE",
  seismic: "GROUP_B_SUBSURFACE",
  acoustic: "GROUP_B_SUBSURFACE",
  thermal: "GROUP_C_SURFACE",
  rgb: "GROUP_C_SURFACE",
};

/** Group-level caps and weights specified in docs/Prototype.md */
export const GROUP_CAPS: Record<SensorGroupId, number> = {
  GROUP_A_ELECTRONIC: 4.5,
  GROUP_B_SUBSURFACE: 4.0,
  GROUP_C_SURFACE: 2.2,
};

export const GROUP_WEIGHTS: Record<SensorGroupId, number> = {
  GROUP_A_ELECTRONIC: 1.0,
  GROUP_B_SUBSURFACE: 0.95,
  GROUP_C_SURFACE: 0.6,
};

export interface LikelihoodResult {
  sensorId: SensorId;
  groupId: SensorGroupId;
  label: string;
  state: SensorState;
  evidenceValue: number | null;
  likelihoodRatio: number; // LR = P(z|H) / P(z|~H)
  logLikelihoodRatio: number; // ln(LR)
  reliabilityWeight: number; // alpha_s(theta)
  weightedLlr: number; // alpha_s(theta) * ln(LR)
  isUnavailable: boolean;
  probGivenVictim: number; // P(z|H)
  probGivenNoVictim: number; // P(z|~H)
}

export interface GroupFusionResult {
  groupId: SensorGroupId;
  rawSumLlr: number;
  cappedLlr: number; // Lambda_g bounded by Gamma_g
  groupWeight: number; // w_g
  effectiveContribution: number; // w_g * Lambda_g
}

/**
 * Calculates dynamic sensor reliability weight alpha_s(theta)
 * theta = { state, signal_quality, environmental_quality, interference, visibility }
 */
export function calculateReliabilityWeight(evidence?: Partial<SensorEvidence> | undefined): number {
  if (!evidence) return 0.0;
  const state = evidence.state ?? "UNAVAILABLE";

  if (state === "OFFLINE" || state === "UNAVAILABLE") {
    return 0.0;
  }

  const baseStateFactor = state === "ACTIVE" ? 1.0 : 0.4;
  const sigQual = evidence.signal_quality ?? 1.0;
  const envQual = evidence.environmental_quality ?? 1.0;
  const interference = evidence.interference ?? 0.0;
  const interferenceFactor = Math.max(0.1, 1.0 - 0.6 * interference);

  let visibilityFactor = 1.0;
  if (evidence.sensor_id === "thermal" || evidence.sensor_id === "rgb") {
    if (evidence.visibility === "POOR") {
      visibilityFactor = 0.4;
    } else if (evidence.visibility === "MODERATE") {
      visibilityFactor = 0.7;
    }
  }

  const weight = baseStateFactor * sigQual * envQual * interferenceFactor * visibilityFactor;
  return Math.min(1.0, Math.max(0.0, weight));
}

/**
 * Calculates individual Sensor Likelihood Ratio and weighted LLR.
 *
 * MISSING / UNAVAILABLE SENSOR RULE:
 * If a sensor is UNAVAILABLE, OFFLINE, or evidence is null:
 * P(z|H) = P(z|~H) => LR = 1.0 => ln(LR) = 0.0.
 * Contributes exactly ZERO evidence.
 */
export function computeSensorLikelihood(
  sensorId: SensorId,
  label: string,
  evidence?: Partial<SensorEvidence> | undefined,
  customParams?: SensorModelParams,
): LikelihoodResult {
  const groupId = SENSOR_GROUP_MAP[sensorId] ?? "GROUP_A_ELECTRONIC";
  const state: SensorState = evidence?.state ?? "UNAVAILABLE";
  const evidenceVal = evidence?.evidence ?? null;

  if (state === "UNAVAILABLE" || state === "OFFLINE" || evidenceVal === null) {
    return {
      sensorId,
      groupId,
      label,
      state,
      evidenceValue: null,
      likelihoodRatio: 1.0,
      logLikelihoodRatio: 0.0,
      reliabilityWeight: 0.0,
      weightedLlr: 0.0,
      isUnavailable: true,
      probGivenVictim: 0.5,
      probGivenNoVictim: 0.5,
    };
  }

  const params = customParams ?? SENSOR_PRIOR_PARAMS[sensorId] ?? { tpr: 0.7, fpr: 0.1 };
  const alpha = calculateReliabilityWeight(evidence);

  const e = Math.min(1.0, Math.max(0.0, evidenceVal));
  const pGivenH = Math.min(0.99, Math.max(0.01, params.tpr * (0.3 + 0.7 * e)));
  const pGivenNotH = Math.min(0.99, Math.max(0.01, params.fpr * (1.2 - 0.7 * e) + 0.01));

  const lr = pGivenH / pGivenNotH;
  const lnLr = Math.log(lr);
  const weightedLlr = alpha * lnLr;

  return {
    sensorId,
    groupId,
    label,
    state,
    evidenceValue: e,
    likelihoodRatio: lr,
    logLikelihoodRatio: lnLr,
    reliabilityWeight: alpha,
    weightedLlr,
    isUnavailable: false,
    probGivenVictim: pGivenH,
    probGivenNoVictim: pGivenNotH,
  };
}

/**
 * Executes Group-Capped LLR Fusion (docs/Prototype.md Section 1.2.2)
 * Bounds aggregate group evidence by group cap Gamma_g to prevent confidence inflation from redundant sensors.
 *
 * Lambda_{g,t}(i) = sign(max_s LLR_s) * min( Gamma_g, | Sum_s beta_s * LLR_s | )
 */
export function computeGroupCappedFusion(likelihoods: LikelihoodResult[]): {
  groups: GroupFusionResult[];
  totalEvidenceLogOddsGain: number;
} {
  const groups: SensorGroupId[] = [
    "GROUP_A_ELECTRONIC",
    "GROUP_B_SUBSURFACE",
    "GROUP_C_SURFACE",
  ];

  let totalEvidenceLogOddsGain = 0;

  const groupResults: GroupFusionResult[] = groups.map((gId) => {
    const groupSensors = likelihoods.filter((l) => l.groupId === gId && !l.isUnavailable);

    if (groupSensors.length === 0) {
      return {
        groupId: gId,
        rawSumLlr: 0,
        cappedLlr: 0,
        groupWeight: GROUP_WEIGHTS[gId],
        effectiveContribution: 0,
      };
    }

    const rawSumLlr = groupSensors.reduce((sum, s) => sum + s.weightedLlr, 0);
    const maxSensorLlr = Math.max(...groupSensors.map((s) => s.weightedLlr));
    const sign = maxSensorLlr < 0 && rawSumLlr < 0 ? -1 : 1;

    const cap = GROUP_CAPS[gId];
    const cappedLlr = sign * Math.min(cap, Math.abs(rawSumLlr));
    const groupWeight = GROUP_WEIGHTS[gId];
    const effectiveContribution = groupWeight * cappedLlr;

    totalEvidenceLogOddsGain += effectiveContribution;

    return {
      groupId: gId,
      rawSumLlr,
      cappedLlr,
      groupWeight,
      effectiveContribution,
    };
  });

  return {
    groups: groupResults,
    totalEvidenceLogOddsGain,
  };
}
