import type { Priority, RecommendedAction, SensorEvidence, SensorId, SensorStatus } from "@/lib/types";
import { BayesianState, computeBayesianUpdate } from "./bayesian";
import { generateDeterministicExplanations, ExplanationItem } from "./explanations";
import { computeGroupCappedFusion, computeSensorLikelihood, GroupFusionResult, LikelihoodResult } from "./likelihood";
import { computeSearchMetrics, SearchModelMetrics } from "./searchModel";
import { computeZoneTerrainFeatures, ZoneTerrainFeatures } from "./terrainAnalysis";
import { calculateMultiPassPersistence, calculateSurvivalFactor, TemporalPersistenceResult } from "./temporal";
import { computeUtility, UtilityBreakdown } from "./utility";

export * from "./bayesian";
export * from "./likelihood";
export * from "./temporal";
export * from "./searchModel";
export * from "./utility";
export * from "./explanations";
export * from "./terrainAnalysis";

export interface ZoneEngineInput {
  zoneId: string;
  priorProbability: number;
  latitude?: number | undefined;
  longitude?: number | undefined;
  evidences?: Partial<Record<SensorId, Partial<SensorEvidence>>> | undefined;
  sensorStatuses?: SensorStatus[] | undefined;
  elapsedMinutes?: number | undefined;
  snowDensityKgM3?: number | undefined;
  cumulativePod?: number | undefined;
  distanceMeters?: number | undefined;
  distanceFromBaseM?: number | undefined;
  burialDepthMeters?: number | null | undefined;
  estimatedDepthM?: number | null | undefined;
  slopeAngleDegrees?: number | undefined;
  inAvalanchePath?: boolean | undefined;
  recentPassLogOdds?: number[] | undefined;
  previousLogOdds?: number | undefined;
}

export interface EngineZoneResult {
  zoneId: string;
  bayesian: BayesianState;
  likelihoods: LikelihoodResult[];
  groups: GroupFusionResult[];
  temporal: TemporalPersistenceResult;
  survivalFactor: number;
  terrainFeatures: ZoneTerrainFeatures;
  searchMetrics: SearchModelMetrics;
  utility: UtilityBreakdown;
  priority: Priority;
  recommendedAction: RecommendedAction;
  explanations: ExplanationItem[];
}

/**
 * Core Mathematical Engine Orchestrator
 * Executes Phase 1 & Phase 2C decision logic for a search zone.
 */
export function computeZoneDecision(input: ZoneEngineInput): EngineZoneResult {
  const elapsedMin = input.elapsedMinutes ?? 15;
  const distM = input.distanceMeters ?? input.distanceFromBaseM ?? 150;
  const depthM = input.burialDepthMeters ?? input.estimatedDepthM ?? 1.2;
  const snowDensity = input.snowDensityKgM3 ?? 350;

  const lat = input.latitude ?? 34.1234;
  const lon = input.longitude ?? 77.4567;

  // 1. Compute Copernicus DEM GLO-30 Terrain Features (Elevation, Slope Angle theta_i, Aspect, R_hazard)
  const terrainFeatures = computeZoneTerrainFeatures(lat, lon, input.zoneId);
  const slopeDeg = input.slopeAngleDegrees ?? terrainFeatures.slopeAngleDegrees;

  // 2. Compute Likelihoods for all 8 Sensor Modalities
  const rawEvidences = input.evidences ?? {};
  const sensorStatuses = input.sensorStatuses ?? [];

  const ALL_SENSOR_IDS: { id: SensorId; label: string }[] = [
    { id: "rf", label: "RF Transceiver" },
    { id: "recco", label: "RECCO Radar" },
    { id: "mobile_rf", label: "Mobile RF" },
    { id: "gpr", label: "GPR Life Radar" },
    { id: "seismic", label: "Seismic Geophone" },
    { id: "acoustic", label: "Acoustic Array" },
    { id: "thermal", label: "Thermal UAV" },
    { id: "rgb", label: "RGB Optical" },
  ];

  const likelihoods: LikelihoodResult[] = ALL_SENSOR_IDS.map((s) => {
    const rawEv = rawEvidences[s.id];
    const statusObj = sensorStatuses.find((st) => st.id === s.id);
    const combinedState = rawEv?.state ?? statusObj?.state ?? "UNAVAILABLE";

    const mergedEv: Partial<SensorEvidence> = {
      ...rawEv,
      sensor_id: s.id,
      state: combinedState,
    };

    return computeSensorLikelihood(s.id, s.label, mergedEv);
  });

  // 3. Execute Group-Capped Sensor Fusion (Correction 6)
  const { groups, totalEvidenceLogOddsGain } = computeGroupCappedFusion(likelihoods);

  // 4. Multi-Pass Temporal Persistence Term (Correction 7)
  const temporal = calculateMultiPassPersistence(input.recentPassLogOdds ?? []);

  // 5. Recursive Bayesian Update (Log-Odds & Sigmoid)
  const bayesian = computeBayesianUpdate(
    input.priorProbability,
    totalEvidenceLogOddsGain,
    temporal.temporalTerm,
    input.previousLogOdds,
  );

  // 6. Victim Survival Factor S(t_elapsed, rho_snow)
  const survivalFactor = calculateSurvivalFactor(elapsedMin, snowDensity);

  // 7. SAR Spatiotemporal Utility Score U(i,t) driven by DEM Slope Hazard Risk R_hazard(theta_i)
  const utility = computeUtility({
    victimProbability: bayesian.probability,
    survivalFactor,
    distanceMeters: distM,
    burialDepthMeters: depthM,
    slopeAngleDegrees: slopeDeg,
  });

  // 8. Search Theory Metrics (POA, POD, POS, POA_effective)
  const activeWeights = likelihoods.map((l) => l.reliabilityWeight);
  const searchMetrics = computeSearchMetrics(
    bayesian.probability,
    activeWeights,
    input.cumulativePod ?? 0.0,
  );

  // 9. Triage Priority & Action based on Bayesian Probability
  const { priority, recommendedAction } = determinePriorityAndAction(bayesian.probability);

  // 10. Generate Deterministic Explanations
  const explanations = generateDeterministicExplanations(
    bayesian,
    likelihoods,
    searchMetrics,
    utility,
    { inAvalanchePath: input.inAvalanchePath ?? false, depthM },
  );

  return {
    zoneId: input.zoneId,
    bayesian,
    likelihoods,
    groups,
    temporal,
    survivalFactor,
    terrainFeatures,
    searchMetrics,
    utility,
    priority,
    recommendedAction,
    explanations,
  };
}

/**
 * Assigns Triage Priority & Recommended Action based on Prototype.md Operational Thresholds
 */
export function determinePriorityAndAction(prob: number): {
  priority: Priority;
  recommendedAction: RecommendedAction;
} {
  if (prob >= 0.85) {
    return {
      priority: "P1",
      recommendedAction: "PINPOINT_AND_PROBE",
    };
  }

  if (prob >= 0.45) {
    return {
      priority: "P2",
      recommendedAction: "SECONDARY_SENSOR_SCAN",
    };
  }

  return {
    priority: "P3",
    recommendedAction: "DEFER",
  };
}
