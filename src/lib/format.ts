import type { Priority, RecommendedAction, SensorState } from "@/lib/types";

export const pct = (v: number | null | undefined) =>
  v === null || v === undefined ? "—" : `${Math.round(v * 100)}%`;

export const meters = (v: number | null | undefined, prefix = "") =>
  v === null || v === undefined ? "—" : `${prefix}${v.toFixed(1)} m`;

export const ACTION_LABEL: Record<RecommendedAction, string> = {
  PINPOINT_AND_PROBE: "PINPOINT → PROBE",
  SECONDARY_SENSOR_SCAN: "SECONDARY SENSOR SCAN",
  REMOTE_SENSING: "REMOTE SENSING",
  DEFER: "DEFER",
  INSUFFICIENT_EVIDENCE: "INSUFFICIENT EVIDENCE",
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  P1: "SEARCH NOW",
  P2: "SECONDARY SCAN",
  P3: "DEFER",
};

export const priorityClass = (p: Priority | null) => {
  if (p === "P1") return "text-p1 border-p1/50 bg-p1/10";
  if (p === "P2") return "text-p2 border-p2/50 bg-p2/10";
  if (p === "P3") return "text-p3 border-p3/40 bg-p3/10";
  return "text-muted-foreground border-border bg-muted/40";
};

export const priorityFill = (p: Priority | null) => {
  if (p === "P1") return "var(--p1)";
  if (p === "P2") return "var(--p2)";
  if (p === "P3") return "var(--p3)";
  return "var(--muted-foreground)";
};

export const stateClass = (s: SensorState) => {
  switch (s) {
    case "ACTIVE":
      return "text-state-active";
    case "DEGRADED":
      return "text-state-degraded";
    case "OFFLINE":
      return "text-state-offline";
    default:
      return "text-muted-foreground";
  }
};

export const stateGlyph = (s: SensorState) => {
  switch (s) {
    case "ACTIVE":
      return "●";
    case "DEGRADED":
      return "◐";
    case "OFFLINE":
      return "○";
    default:
      return "◌";
  }
};

export const coord = (lat: number, lon: number) =>
  `${lat.toFixed(4)}° N   ${lon.toFixed(4)}° E`;

export const bearingLabel = (deg: number) => {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16] ?? "N";
};
