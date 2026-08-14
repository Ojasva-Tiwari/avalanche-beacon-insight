import type {
  PhysicalAdapterResult,
  PhysicalSensorPacket,
  SensorEvidence,
  SensorId,
  SensorObservation,
} from "@/lib/types";

export interface ValidationResult {
  valid: boolean;
  errorCode?: string;
  errorMessage?: string;
}

const KNOWN_SENSOR_IDS: Set<string> = new Set([
  "rf",
  "recco",
  "gpr",
  "thermal",
  "rgb",
  "seismic",
  "acoustic",
  "mobile_rf",
]);

/**
 * Phase 5 Physical Sensor Adapter Layer
 * Transforms physical hardware transport packets into validated SensorObservation instances
 * WITHOUT manufacturing empirical calibration curves or [0,1] normalization math.
 */
export class PhysicalSensorAdapter {
  public static processPhysicalPacket(packet: PhysicalSensorPacket): PhysicalAdapterResult {
    // 1. Schema & Required Field Check
    if (!packet || typeof packet !== "object") {
      return { valid: false, isQuarantined: false, errorCode: "INVALID_SCHEMA", errorMessage: "Packet payload must be an object." };
    }

    if (!packet.rawPacketId || typeof packet.rawPacketId !== "string" || packet.rawPacketId.trim() === "") {
      return { valid: false, isQuarantined: false, errorCode: "INVALID_SCHEMA", errorMessage: "Missing or empty 'rawPacketId'." };
    }

    if (!packet.physicalSensorId || typeof packet.physicalSensorId !== "string" || packet.physicalSensorId.trim() === "") {
      return { valid: false, isQuarantined: false, errorCode: "INVALID_SCHEMA", errorMessage: "Missing or empty 'physicalSensorId'." };
    }

    if (!packet.modality || typeof packet.modality !== "string" || packet.modality.trim() === "") {
      return { valid: false, isQuarantined: false, errorCode: "INVALID_SCHEMA", errorMessage: "Missing or empty 'modality'." };
    }

    if (!packet.zoneId || typeof packet.zoneId !== "string" || packet.zoneId.trim() === "") {
      return { valid: false, isQuarantined: false, errorCode: "INVALID_SCHEMA", errorMessage: "Missing or empty 'zoneId'." };
    }

    if (!packet.incidentId || typeof packet.incidentId !== "string" || packet.incidentId.trim() === "") {
      return { valid: false, isQuarantined: false, errorCode: "INVALID_SCHEMA", errorMessage: "Missing or empty 'incidentId'." };
    }

    // 2. Modality Check
    const baseModality = packet.modality.toLowerCase().split("_")[0] ?? "";
    if (!KNOWN_SENSOR_IDS.has(packet.modality.toLowerCase()) && !KNOWN_SENSOR_IDS.has(baseModality)) {
      return { valid: false, isQuarantined: false, errorCode: "UNKNOWN_SENSOR_MODALITY", errorMessage: `Unrecognized modality '${packet.modality}'.` };
    }

    // 3. Timestamp Check
    if (!packet.eventTimestampIso || typeof packet.eventTimestampIso !== "string" || packet.eventTimestampIso.trim() === "") {
      return { valid: false, isQuarantined: false, errorCode: "MISSING_TIMESTAMP", errorMessage: "Missing mandatory 'eventTimestampIso'." };
    }

    const eventTime = new Date(packet.eventTimestampIso).getTime();
    if (isNaN(eventTime) || !Number.isFinite(eventTime)) {
      return { valid: false, isQuarantined: false, errorCode: "INVALID_TIMESTAMP", errorMessage: "Malformed 'eventTimestampIso'." };
    }

    const now = Date.now();
    if (eventTime > now + 300000) {
      return { valid: false, isQuarantined: false, errorCode: "TIMESTAMP_FUTURE_CLOCK_SKEW", errorMessage: "eventTimestampIso is in future (>300s clock skew)." };
    }

    // 4. Derived output write attempt check in rawPayload
    const derivedKeys = ["victimProbability", "victim_probability", "utilityScore", "utility_score", "triagePriority", "priority"];
    for (const key of derivedKeys) {
      if (packet.rawPayload && key in packet.rawPayload && packet.rawPayload[key] !== undefined && packet.rawPayload[key] !== null) {
        return {
          valid: false,
          isQuarantined: false,
          errorCode: "DERIVED_OUTPUT_READ_ONLY",
          errorMessage: `Physical packet payload contains forbidden derived output key '${key}'.`,
        };
      }
    }

    // 5. Unit system check & Unsupported physical data quarantine
    // If unitDeclarations exist with non-normalized units and no pre-normalized [0,1] measurement is provided
    let isQuarantined = false;
    let quarantineReason: string | undefined = undefined;

    if (packet.unitDeclarations && packet.unitDeclarations.length > 0) {
      const unnormalizedUnit = packet.unitDeclarations.find((u) => !u.isNormalized0to1);
      if (unnormalizedUnit && (packet.normalizedMeasurement === undefined || packet.normalizedMeasurement === null)) {
        isQuarantined = true;
        quarantineReason = `UNSUPPORTED_FOR_DECISION: Raw physical metric '${unnormalizedUnit.metricName}' has unit '${unnormalizedUnit.unit}' with no approved specification formula to convert to [0,1] evidence. Preserved losslessly in metadata.`;
      }
    }

    // If measurement is provided, check bounds
    let finalMeasurement: number | null = null;
    if (packet.normalizedMeasurement !== undefined && packet.normalizedMeasurement !== null) {
      if (typeof packet.normalizedMeasurement !== "number" || !Number.isFinite(packet.normalizedMeasurement) || packet.normalizedMeasurement < 0.0 || packet.normalizedMeasurement > 1.0) {
        return {
          valid: false,
          isQuarantined: false,
          errorCode: "MEASUREMENT_OUT_OF_BOUNDS",
          errorMessage: `normalizedMeasurement '${packet.normalizedMeasurement}' must be a finite number in [0.0, 1.0].`,
        };
      }
      finalMeasurement = packet.normalizedMeasurement;
    } else if (!isQuarantined) {
      // If no measurement provided and not quarantined by unit declaration, mark quarantined for missing pre-normalized evidence
      isQuarantined = true;
      quarantineReason = "UNSUPPORTED_FOR_DECISION: Physical packet contains raw payload without pre-normalized [0,1] measurement.";
    }

    // Check confidence bounds if provided
    if (packet.normalizedConfidence !== undefined && packet.normalizedConfidence !== null) {
      if (typeof packet.normalizedConfidence !== "number" || !Number.isFinite(packet.normalizedConfidence) || packet.normalizedConfidence < 0.0 || packet.normalizedConfidence > 1.0) {
        return {
          valid: false,
          isQuarantined: false,
          errorCode: "CONFIDENCE_OUT_OF_BOUNDS",
          errorMessage: `normalizedConfidence '${packet.normalizedConfidence}' must be a finite number in [0.0, 1.0].`,
        };
      }
    }

    const observation: SensorObservation = {
      observationId: packet.rawPacketId,
      incidentId: packet.incidentId,
      zoneId: packet.zoneId,
      sensorId: packet.physicalSensorId,
      sensorType: packet.modality,
      eventTimestamp: packet.eventTimestampIso,
      ingestionTimestamp: new Date().toISOString(),
      measurement: isQuarantined ? null : finalMeasurement,
      confidence: packet.normalizedConfidence ?? null,
      environmentalQuality: packet.environmentalQuality ?? null,
      interference: packet.interference ?? null,
      metadata: {
        rawPacketId: packet.rawPacketId,
        physicalSensorId: packet.physicalSensorId,
        transportProtocol: packet.transportProtocol ?? "UNSPECIFIED",
        unitDeclarations: packet.unitDeclarations ?? [],
        rawPayload: { ...(packet.rawPayload ?? {}) },
        dataMode: packet.dataMode ?? "REAL_SENSOR",
        quarantineStatus: isQuarantined ? "UNSUPPORTED_FOR_DECISION" : "ENGINE_READY",
        quarantineReason,
      },
    };

    return {
      valid: true,
      observation,
      isQuarantined,
      quarantineReason,
    };
  }
}


/**
 * Validates incoming SensorObservation payload according to strict Phase 3B safety rules.
 */
export function validateObservation(
  obs: Partial<SensorObservation> & Record<string, any>,
): ValidationResult {
  // 1. Derived output immutability check
  const derivedKeys = [
    "victimProbability",
    "victim_probability",
    "utilityScore",
    "utility_score",
    "triagePriority",
    "priority",
    "slopeHazardRisk",
    "slope_hazard_risk",
    "recommendedAction",
    "recommended_action",
  ];

  for (const key of derivedKeys) {
    if (key in obs && obs[key] !== undefined && obs[key] !== null) {
      return {
        valid: false,
        errorCode: "DERIVED_OUTPUT_READ_ONLY",
        errorMessage: `Client cannot submit derived mathematical output '${key}'. All outputs must be generated by computeZoneDecision.`,
      };
    }
  }

  // 2. Required string schema checks
  if (!obs.observationId || typeof obs.observationId !== "string" || obs.observationId.trim() === "") {
    return { valid: false, errorCode: "INVALID_SCHEMA", errorMessage: "Missing or invalid 'observationId'." };
  }

  if (!obs.sensorId || typeof obs.sensorId !== "string" || obs.sensorId.trim() === "") {
    return { valid: false, errorCode: "INVALID_SCHEMA", errorMessage: "Missing or invalid 'sensorId'." };
  }

  if (!obs.zoneId || typeof obs.zoneId !== "string" || obs.zoneId.trim() === "") {
    return { valid: false, errorCode: "INVALID_SCHEMA", errorMessage: "Missing or invalid 'zoneId'." };
  }

  // 3. Known modality/prefix check
  const baseSensorId = obs.sensorId.toLowerCase().split("_")[0] ?? "";
  if (!KNOWN_SENSOR_IDS.has(obs.sensorId.toLowerCase()) && !KNOWN_SENSOR_IDS.has(baseSensorId)) {
    return {
      valid: false,
      errorCode: "UNKNOWN_SENSOR_MODALITY",
      errorMessage: `Unrecognized sensor ID or modality '${obs.sensorId}'.`,
    };
  }

  // 4. Mandatory Event Timestamp validation
  if (!obs.eventTimestamp || typeof obs.eventTimestamp !== "string" || obs.eventTimestamp.trim() === "") {
    return {
      valid: false,
      errorCode: "MISSING_TIMESTAMP",
      errorMessage: "Mandatory field 'eventTimestamp' is missing or empty.",
    };
  }

  const eventTime = new Date(obs.eventTimestamp).getTime();
  if (isNaN(eventTime) || !Number.isFinite(eventTime)) {
    return {
      valid: false,
      errorCode: "INVALID_TIMESTAMP",
      errorMessage: "Malformed or non-finite 'eventTimestamp'.",
    };
  }

  const now = Date.now();
  if (eventTime > now + 300000) {
    return {
      valid: false,
      errorCode: "TIMESTAMP_FUTURE_CLOCK_SKEW",
      errorMessage: "eventTimestamp is in the future beyond allowed 300s clock skew threshold.",
    };
  }

  // 5. Strict numeric bounds checks: finite number in [0.0, 1.0]
  if (obs.measurement !== undefined && obs.measurement !== null) {
    if (typeof obs.measurement !== "number" || !Number.isFinite(obs.measurement) || obs.measurement < 0.0 || obs.measurement > 1.0) {
      return {
        valid: false,
        errorCode: "MEASUREMENT_OUT_OF_BOUNDS",
        errorMessage: `Measurement '${obs.measurement}' must be a finite number in [0.0, 1.0].`,
      };
    }
  }

  if (obs.confidence !== undefined && obs.confidence !== null) {
    if (typeof obs.confidence !== "number" || !Number.isFinite(obs.confidence) || obs.confidence < 0.0 || obs.confidence > 1.0) {
      return {
        valid: false,
        errorCode: "CONFIDENCE_OUT_OF_BOUNDS",
        errorMessage: `Confidence '${obs.confidence}' must be a finite number in [0.0, 1.0].`,
      };
    }
  }

  if (obs.environmentalQuality !== undefined && obs.environmentalQuality !== null) {
    if (
      typeof obs.environmentalQuality !== "number" ||
      !Number.isFinite(obs.environmentalQuality) ||
      obs.environmentalQuality < 0.0 ||
      obs.environmentalQuality > 1.0
    ) {
      return {
        valid: false,
        errorCode: "ENVIRONMENTAL_QUALITY_OUT_OF_BOUNDS",
        errorMessage: `EnvironmentalQuality '${obs.environmentalQuality}' must be a finite number in [0.0, 1.0].`,
      };
    }
  }

  if (obs.interference !== undefined && obs.interference !== null) {
    if (
      typeof obs.interference !== "number" ||
      !Number.isFinite(obs.interference) ||
      obs.interference < 0.0 ||
      obs.interference > 1.0
    ) {
      return {
        valid: false,
        errorCode: "INTERFERENCE_OUT_OF_BOUNDS",
        errorMessage: `Interference '${obs.interference}' must be a finite number in [0.0, 1.0].`,
      };
    }
  }

  return { valid: true };
}

/**
 * Normalizes SensorObservation physical instance ID to core SensorId key.
 * e.g., "rf_uav_alpha_01" -> "rf", "gpr_ground_02" -> "gpr"
 */
export function resolveCoreSensorId(sensorId: string): SensorId {
  const lower = sensorId.toLowerCase();
  if (KNOWN_SENSOR_IDS.has(lower)) {
    return lower as SensorId;
  }
  const prefix = lower.split("_")[0] ?? "";
  if (KNOWN_SENSOR_IDS.has(prefix)) {
    return prefix as SensorId;
  }
  return "rf"; // Safe fallback mapping
}

/**
 * Converts validated SensorObservation[] array to normalized evidence contract payload
 * expected by computeZoneDecision WITHOUT inventing or modifying LLR formulas.
 *
 * Checks for intra-modality multi-instance collisions (multiple distinct physical sensorIds
 * mapping to the same core modality key). If an unspecified collision is detected, throws an
 * explicit MULTI_INSTANCE_FUSION_UNSPECIFIED error rather than silently overwriting data.
 */
export function adaptObservationsToEvidence(
  observations: SensorObservation[],
): Partial<Record<SensorId, Partial<SensorEvidence>>> {
  // Detect intra-modality multi-instance collision
  const modalityInstancesMap: Record<string, Set<string>> = {};

  for (const obs of observations) {
    const coreId = resolveCoreSensorId(obs.sensorId);
    if (!modalityInstancesMap[coreId]) {
      modalityInstancesMap[coreId] = new Set();
    }
    modalityInstancesMap[coreId]!.add(obs.sensorId);
  }

  for (const coreId of Object.keys(modalityInstancesMap)) {
    const instances = modalityInstancesMap[coreId]!;
    if (instances.size > 1) {
      const instanceList = Array.from(instances).join(", ");
      throw new Error(
        `MULTI_INSTANCE_FUSION_UNSPECIFIED: ARCHITECTURAL LIMITATION: Multiple physical sensor instances of modality '${coreId}' (${instanceList}) detected for the same zone. The backend preserves all observations losslessly in storage, but the locked mathematical specification does not define an intra-modality multi-instance fusion rule for decision snapshots.`,
      );
    }
  }

  const evidenceMap: Partial<Record<SensorId, Partial<SensorEvidence>>> = {};

  // Chronological sort ascending
  const sorted = [...observations].sort(
    (a, b) => new Date(a.eventTimestamp).getTime() - new Date(b.eventTimestamp).getTime(),
  );

  for (const obs of sorted) {
    const coreId = resolveCoreSensorId(obs.sensorId);
    evidenceMap[coreId] = {
      sensor_id: coreId,
      evidence: obs.measurement,
      signal_quality: obs.confidence,
      environmental_quality: obs.environmentalQuality,
      interference: obs.interference,
      estimated_depth_m: obs.estimatedDepthM ?? null,
      localization_error_m: obs.localizationErrorM ?? null,
      state: obs.measurement !== null ? "ACTIVE" : "UNAVAILABLE",
    };
  }

  return evidenceMap;
}
