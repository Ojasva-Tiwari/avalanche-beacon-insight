import demJson from "../../../public/terrain/copernicus-glo30/dem-glo30-n34e077.json";
import { calculateSlopeHazardRisk } from "./utility";

export interface ZoneTerrainFeatures {
  zoneId: string;
  latitude: number;
  longitude: number;
  elevationM: number;
  slopeAngleDegrees: number;
  aspectDegrees: number;
  aspectCompass: "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";
  slopeHazardRisk: number; // R_hazard(theta_i)
  slopeCategory: "FLAT" | "MODERATE" | "AVALANCHE_PRONE" | "EXTREME";
}

const bounds = demJson.bounds as [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
const [minLon, minLat, maxLon, maxLat] = bounds;
const [gridW, gridH] = demJson.gridDimensions as [number, number];
const elevations = demJson.elevations as number[][];

/**
 * Samples elevation z at any (lat, lon) within the Copernicus GLO-30 N34E077 DEM grid.
 */
export function sampleCopernicusElevation(lat: number, lon: number): number {
  if (lat < minLat || lat > maxLat || lon < minLon || lon > maxLon) {
    return 3276.0; // Default incident baseline fallback outside AOI
  }

  const cFrac = ((lon - minLon) / (maxLon - minLon)) * (gridW - 1);
  const rFrac = ((maxLat - lat) / (maxLat - minLat)) * (gridH - 1);

  const c0 = Math.floor(cFrac);
  const c1 = Math.min(gridW - 1, c0 + 1);
  const r0 = Math.floor(rFrac);
  const r1 = Math.min(gridH - 1, r0 + 1);

  const dc = cFrac - c0;
  const dr = rFrac - r0;

  const row0 = elevations[r0] ?? [];
  const row1 = elevations[r1] ?? [];

  const v00 = row0[c0] ?? 3276;
  const v01 = row0[c1] ?? 3276;
  const v10 = row1[c0] ?? 3276;
  const v11 = row1[c1] ?? 3276;

  const top = v00 * (1 - dc) + v01 * dc;
  const bottom = v10 * (1 - dc) + v11 * dc;

  return Math.round((top * (1 - dr) + bottom * dr) * 10) / 10;
}

/**
 * Computes terrain slope, aspect, and hazard risk R_hazard(theta) from Copernicus DEM GLO-30.
 */
export function computeZoneTerrainFeatures(
  latitude: number,
  longitude: number,
  zoneId: string = "UNKNOWN",
): ZoneTerrainFeatures {
  const elevM = sampleCopernicusElevation(latitude, longitude);

  // 30m sampling delta (~0.00027 degrees)
  const dDegrees = 0.00027;

  const zNorth = sampleCopernicusElevation(latitude + dDegrees, longitude);
  const zSouth = sampleCopernicusElevation(latitude - dDegrees, longitude);
  const zEast = sampleCopernicusElevation(latitude, longitude + dDegrees);
  const zWest = sampleCopernicusElevation(latitude, longitude - dDegrees);

  const dYMeters = dDegrees * 111320.0;
  const dXMeters = dDegrees * 111320.0 * Math.cos((latitude * Math.PI) / 180.0);

  const dz_dx = (zEast - zWest) / (2.0 * dXMeters);
  const dz_dy = (zNorth - zSouth) / (2.0 * dYMeters);

  const slopeRad = Math.atan(Math.sqrt(dz_dx * dz_dx + dz_dy * dz_dy));
  const slopeDeg = Math.round(((slopeRad * 180.0) / Math.PI) * 10) / 10;

  let aspectRad = Math.atan2(dz_dy, -dz_dx);
  let aspectDeg = Math.round(((90.0 - (aspectRad * 180.0) / Math.PI + 360.0) % 360.0) * 10) / 10;

  const aspectCompass = getCompassDirection(aspectDeg);
  const slopeHazardRisk = calculateSlopeHazardRisk(slopeDeg);
  const slopeCategory = getSlopeCategory(slopeDeg);

  return {
    zoneId,
    latitude,
    longitude,
    elevationM: elevM,
    slopeAngleDegrees: slopeDeg,
    aspectDegrees: aspectDeg,
    aspectCompass,
    slopeHazardRisk,
    slopeCategory,
  };
}

function getCompassDirection(deg: number): "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW" {
  const directions: ("N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW")[] = [
    "N", "NE", "E", "SE", "S", "SW", "W", "NW",
  ];
  const idx = Math.floor(((deg + 22.5) % 360) / 45);
  return directions[idx] ?? "N";
}

function getSlopeCategory(slopeDeg: number): "FLAT" | "MODERATE" | "AVALANCHE_PRONE" | "EXTREME" {
  if (slopeDeg < 15.0) return "FLAT";
  if (slopeDeg < 25.0) return "MODERATE";
  if (slopeDeg <= 45.0) return "AVALANCHE_PRONE";
  return "EXTREME";
}
