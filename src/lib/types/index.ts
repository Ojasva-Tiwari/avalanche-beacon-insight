// Centralized domain types for the Avalanche Rescue Command System frontend.
// The frontend only CONSUMES these values. All intelligence is produced by the
// backend (today: deterministic mock backend in src/lib/mock).

export type SensorId =
  | "rf"
  | "recco"
  | "gpr"
  | "thermal"
  | "rgb"
  | "seismic"
  | "acoustic"
  | "mobile_rf";

export type SensorState = "ACTIVE" | "DEGRADED" | "OFFLINE" | "UNAVAILABLE";

export type Priority = "P1" | "P2" | "P3";

export type RecommendedAction =
  | "PINPOINT_AND_PROBE"
  | "SECONDARY_SENSOR_SCAN"
  | "REMOTE_SENSING"
  | "DEFER"
  | "INSUFFICIENT_EVIDENCE";

export interface Incident {
  incident_id: string;
  location_name: string;
  avalanche_status: "ACTIVE" | "STABILIZING" | "CLEARED";
  last_known_position: { latitude: number; longitude: number };
  avalanche_flow_bearing_deg: number;
  suspected_victims: number;
  declared_at: string;
  elevation_m: number;
  data_source: "SIMULATED";
}

export interface EnvironmentalConditions {
  snow_depth_m: number;
  visibility: "GOOD" | "MODERATE" | "POOR";
  wind: "LOW" | "MODERATE" | "HIGH";
  temperature_c: number;
  data_source: "SIMULATED";
}

export interface SensorStatus {
  id: SensorId;
  label: string;
  short_label: string;
  state: SensorState;
  detail: string;
}

export interface MapRoutingPath {
  waypoints: [number, number][];
  pathType: "RESCUER_TRAVERSE" | "UAV_SWEEP";
}

export interface SearchZone {
  zone_id: string;
  latitude: number;
  longitude: number;
  victim_probability: number | null; // null = no evidence-backed estimate
  priority: Priority | null;
  estimated_depth_m: number | null;
  localization_error_m: number | null;
  recommended_action: RecommendedAction;
  in_avalanche_path: boolean;
  polygonBounds?: [number, number][] | undefined;
  routingPath?: MapRoutingPath | undefined;
}


export interface SensorEvidence {
  sensor_id: SensorId;
  label: string;
  evidence: number | null; // null = sensor contributed no evidence
  signal_quality: number | null;
  environmental_quality: number | null;
  interference: number | null;
  visibility: "GOOD" | "MODERATE" | "POOR" | null;
  estimated_depth_m: number | null;
  localization_error_m: number | null;
  state: SensorState;
}

import type { ZoneTerrainFeatures } from "@/lib/engine/terrainAnalysis";

export interface ZoneDetails {
  zone: string;
  victim_probability: number | null;
  priority: Priority | null;
  recommended_action: RecommendedAction;
  alternative_actions: RecommendedAction[];
  location: { latitude: number; longitude: number; error_m: number | null };
  estimated_depth_m: number | null;
  contextual_prior: "HIGH" | "MODERATE" | "LOW";
  temporal_consistency: number | null;
  evidence: SensorEvidence[];
  explanation: { kind: "SUPPORT" | "CAUTION"; text: string }[];
  status_note: string | null;
  terrain_features?: ZoneTerrainFeatures | undefined;
  polygonBounds?: [number, number][] | undefined;
  routingPath?: MapRoutingPath | undefined;
}

export interface EvidenceEvent {
  timestamp: string;
  source: string;
  event: string;
  description: string;
}

export type MapMode = "OPEN_3D" | "COPERNICUS" | "2D_GRID";

export interface SystemStatus {
  backend: "ONLINE" | "OFFLINE";
  database: "ONLINE" | "OFFLINE";
  fusion_engine: "READY" | "BUSY" | "OFFLINE";
  websocket: "CONNECTED" | "DISCONNECTED";
  sensor_stream: "ACTIVE" | "IDLE";
  last_update: string;
  mode: "DEMO" | "BACKEND";
  network_mode?: "ONLINE" | "OFFLINE_CACHED" | "OFFLINE_NO_DATA" | undefined;
  offline_tile_cached?: boolean | undefined;
}

export interface ReplayEvent {
  t: string; // mm:ss
  seconds: number;
  title: string;
  source: string;
  description: string;
  scenario: ScenarioId;
  contextEstablished: boolean;
}

export interface AnalyticsMetrics {
  search_area: { initial_m2: number; prioritized_m2: number; reduction_pct: number };
  localization: {
    top1_success_pct: number;
    top3_recall_pct: number;
    mean_error_m: number;
    median_error_m: number;
    max_error_m: number;
  };
  robustness: {
    condition: string;
    p1_count: number;
    p2_count: number;
    p3_count: number;
    localization_error_m: number | null;
    search_area_m2: number;
    confidence: number | null;
    note: string | null;
  }[];
  priority_progression: { stage: string; priority: Priority | null; label: string }[];
  scenarios: {
    scenario: string;
    sensor_condition: string;
    ground_truth_zone: string;
    top_predicted_zone: string;
    top3_contains_victim: boolean;
    localization_error_m: number | null;
    p1_generated: boolean;
    recommended_action: RecommendedAction;
  }[];
}

// ---- Simulation ----

export type DemoAction =
  | "RESET_SCENARIO"
  | "GPR_DETECTION"
  | "RF_DETECTION"
  | "REMOVE_RF"
  | "DEGRADE_GPR"
  | "THERMAL_ANOMALY"
  | "CLEAR_THERMAL"
  | "SEISMIC_EVIDENCE";

export type ScenarioId =
  | "T0_NO_EVIDENCE"
  | "CONTEXT_ONLY"
  | "BASE_GPR"
  | "GPR_RF"
  | "GPR_DEGRADED"
  | "GPR_DEGRADED_RF"
  | "GPR_THERMAL_ANOMALY"
  | "GPR_RF_THERMAL"
  | "GPR_SEISMIC"
  | "GPR_RF_SEISMIC"
  | "GPR_NO_THERMAL"
  | "GPR_RF_NO_THERMAL";

export type MapLayerId =
  | "avalanche_boundary"
  | "last_known_position"
  | "search_grid"
  | "terrain"
  | "sensor_coverage"
  | "victim_candidates"
  | "sensor_observations"
  | "rescuer_locations";

export type MapLayers = Record<MapLayerId, boolean>;

// ---- Phase 3 Sensor-Ready Backend API Types ----

export type SensorType =
  | "RF"
  | "RECCO"
  | "MOBILE_RF"
  | "GPR"
  | "SEISMIC"
  | "ACOUSTIC"
  | "THERMAL"
  | "RGB"
  | (string & {});

export interface SensorObservation {
  observationId: string;
  incidentId: string;
  zoneId: string;
  sensorId: string;
  sensorType: SensorType;
  eventTimestamp: string;
  ingestionTimestamp: string;
  measurement: number | null;
  confidence: number | null;
  environmentalQuality: number | null;
  interference: number | null;
  estimatedDepthM?: number | null;
  localizationErrorM?: number | null;
  metadata?: Record<string, any>;
}

export interface IncidentState {
  incidentId: string;
  locationName: string;
  avalancheStatus: "ACTIVE" | "STABILIZING" | "CLEARED";
  lastKnownPosition: { latitude: number; longitude: number };
  avalancheFlowBearingDeg: number;
  suspectedVictims: number;
  declaredAt: string;
  elevationM: number;
  dataSource: "SIMULATED" | "LIVE_FIELD";
  activeScenarioId: ScenarioId;
}

export type DecisionDataMode =
  | "LIVE_CONNECTED"
  | "OFFLINE_CACHED"
  | "OFFLINE_NO_DATA"
  | "SYNTHETIC"
  | "REPLAY"
  | "REAL_SENSOR"
  | "UNKNOWN";

export interface UnitDeclaration {
  metricName: string;
  unit: string;
  isNormalized0to1: boolean;
}

export interface PhysicalSensorPacket {
  rawPacketId: string;
  physicalSensorId: string;
  modality: SensorType;
  incidentId: string;
  zoneId: string;
  eventTimestampIso: string;
  transportProtocol?: string;
  unitDeclarations?: UnitDeclaration[];
  rawPayload: Record<string, any>;
  normalizedMeasurement?: number | null;
  normalizedConfidence?: number | null;
  environmentalQuality?: number | null;
  interference?: number | null;
  dataMode?: DecisionDataMode;
}

export interface PhysicalAdapterResult {
  valid: boolean;
  observation?: SensorObservation | undefined;
  isQuarantined: boolean;
  quarantineReason?: string | undefined;
  errorCode?: string | undefined;
  errorMessage?: string | undefined;
}

export interface DecisionProvenance {
  dataMode: DecisionDataMode;
  decisionTimestamp: string;
  latestEvidenceTimestamp: string | null;
  terrainSource: string;
  evidenceSource: string;
  engineVersion: string;
}

export interface DecisionApiResponse<T> {
  provenance: DecisionProvenance;
  data: T;
}

export interface RtkGpsMetadata {
  lat: number;
  lon: number;
  altM: number;
  hAccM: number; // Horizontal accuracy in meters (sub-centimeter)
  vAccM: number; // Vertical accuracy in meters (sub-centimeter)
}

export interface SnowpackMetadata {
  densityKgM3: number;
  lwcPercent: number; // Liquid Water Content %
  tempC: number;
}

export interface GroundTruthTargetMetadata {
  targetPresent: boolean;
  targetId?: string | undefined;
  depthM?: number | undefined;
  orientationDeg?: number | undefined;
}

export interface FieldObservationPacket {
  experimentId: string;
  sensorSerialId: string;
  modality: SensorType;
  timestampIso: string;
  rtkGps: RtkGpsMetadata;
  snowpack: SnowpackMetadata;
  rawPayload: Record<string, any>;
  groundTruth: GroundTruthTargetMetadata;
  dataMode?: DecisionDataMode;
  payloadHash?: string;
  wormTag?: string;
  ingestTimestampIso?: string;
}

export interface PilotIngestionResult {
  valid: boolean;
  packet?: FieldObservationPacket | undefined;
  payloadHash?: string | undefined;
  wormTag?: string | undefined;
  isQuarantined: boolean;
  quarantineReason?: string | undefined;
  errorCode?: string | undefined;
  errorMessage?: string | undefined;
}

export interface RealFieldTrialMetadata {
  trialId: string;
  locationName: string;
  elevationM: number;
  snowpackType: string;
  weatherConditions: string;
  instrumentSerials: Record<string, string>;
  conductedAtIso: string;
  dataMode: "REAL_SENSOR";
}

export interface SensorDiscrepancyReport {
  modality: SensorType;
  sampleCount: number;
  prototypeLlrScalar: number;
  empiricalLlrMean: number;
  meanAbsoluteError: number;
  rootMeanSquareError: number;
  status: "PROTOTYPE_VALIDATED" | "REFINEMENT_RECOMMENDED" | "DISCREPANCY_FLAGGED";
}

export interface EmpiricalCalibrationResult {
  trialMetadata: RealFieldTrialMetadata;
  calibrationSplitCount: number;
  validationSplitCount: number;
  holdoutSplitCount: number;
  discrepancyReports: SensorDiscrepancyReport[];
  engineModified: false;
}

export type Phase7EDiscrepancyStatus =
  | "SUPPORTED"
  | "PARTIALLY_SUPPORTED"
  | "DISCREPANCY"
  | "INSUFFICIENT_DATA";

export interface Phase7EDiscrepancyReport {
  modality: SensorType;
  sampleCount: number;
  prototypeLlrScalar: number;
  empiricalLlrMean: number;
  meanAbsoluteError: number;
  rootMeanSquareError: number;
  classification: Phase7EDiscrepancyStatus;
}

export interface Phase7EValidationResult {
  experimentId: string;
  dataMode: "REAL_SENSOR";
  totalObservations: number;
  validObservations: number;
  quarantinedObservations: number;
  calibrationCount: number;
  validationCount: number;
  holdoutCount: number;
  discrepancyMatrix: Phase7EDiscrepancyReport[];
  engineModified: false;
  safetyBoundaryNote: string;
}

export interface DemoWorkflowConfig {
  mode: "SYNTHETIC_DEMO";
  incidentName: string;
  lkpLatitude: number;
  lkpLongitude: number;
  timeSinceBurialMinutes: number;
  snowDensityKgM3: number;
  activeSensors: SensorId[];
  isOfflineMode: boolean;
  dataMode: "SYNTHETIC";
}
