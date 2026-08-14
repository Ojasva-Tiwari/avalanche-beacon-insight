import { existsSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { fromArrayBuffer } from "geotiff";

const TILE_URL =
  "https://copernicus-dem-30m.s3.amazonaws.com/Copernicus_DSM_COG_10_N34_00_E077_00_DEM/Copernicus_DSM_COG_10_N34_00_E077_00_DEM.tif";

const SCRATCH_DIR = join(process.cwd(), "scratch");
const TIF_PATH = join(SCRATCH_DIR, "Copernicus_N34_E077.tif");
const OUTPUT_DIR = join(process.cwd(), "public", "terrain", "copernicus-glo30");

async function main() {
  console.log("=== Copernicus DEM GLO-30 N34E077 Preprocessing ===");

  if (!existsSync(SCRATCH_DIR)) {
    mkdirSync(SCRATCH_DIR, { recursive: true });
  }
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Remove old N31 artifact to prevent accidental rendering
  const oldArtifact = join(OUTPUT_DIR, "dem-glo30-himalaya.json");
  if (existsSync(oldArtifact)) {
    rmSync(oldArtifact);
    console.log(`Deleted legacy N31 artifact at ${oldArtifact}`);
  }

  // 1. Fetch GeoTIFF N34E077 from AWS S3 Open Data Bucket
  if (!existsSync(TIF_PATH)) {
    console.log(`Downloading Copernicus GLO-30 Tile N34E077 from AWS S3...`);
    const res = await fetch(TILE_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const buffer = await res.arrayBuffer();
    writeFileSync(TIF_PATH, Buffer.from(buffer));
    console.log(`Saved ${TIF_PATH} (${(buffer.byteLength / 1024 / 1024).toFixed(2)} MB)`);
  } else {
    console.log(`Using existing GeoTIFF at ${TIF_PATH}`);
  }

  // 2. Parse GeoTIFF with geotiff package
  const tiffBuffer = require("fs").readFileSync(TIF_PATH);
  const tiff = await fromArrayBuffer(tiffBuffer.buffer);
  const image = await tiff.getImage();
  const width = image.getWidth();
  const height = image.getHeight();
  const bbox = image.getBoundingBox();

  console.log(`Source Raster Dimensions: ${width} x ${height}`);
  console.log(`Source Bounding Box: [${bbox.join(", ")}]`);

  const rasters = await image.readRasters();
  const elevData = rasters[0] as Float32Array;

  // 3. Extract Incident AOI at 100% Native 30m Resolution
  // Incident LKP: 34.1234°N, 77.4567°E
  // Bounding Box: 34.05°N - 34.20°N, 77.38°E - 77.53°E (0.15° x 0.15°)
  const minLat = 34.05;
  const maxLat = 34.2;
  const minLon = 77.38;
  const maxLon = 77.53;

  // At 1/3600° pixel resolution (30m), 0.15° = 540 pixels exactly
  const targetWidth = Math.round(((maxLon - minLon) / (bbox[2] - bbox[0])) * width);
  const targetHeight = Math.round(((maxLat - minLat) / (bbox[3] - bbox[1])) * height);

  const grid: number[][] = [];
  let minElev = Infinity;
  let maxElev = -Infinity;

  for (let r = 0; r < targetHeight; r++) {
    const lat = maxLat - (r / (targetHeight - 1)) * (maxLat - minLat);
    const rowElevs: number[] = [];
    for (let c = 0; c < targetWidth; c++) {
      const lon = minLon + (c / (targetWidth - 1)) * (maxLon - minLon);

      const px = Math.floor(((lon - bbox[0]) / (bbox[2] - bbox[0])) * width);
      const py = Math.floor(((bbox[3] - lat) / (bbox[3] - bbox[1])) * height);

      const idx = Math.min(width * height - 1, Math.max(0, py * width + px));
      const val = Math.round((elevData[idx] ?? 4180) * 10) / 10;

      rowElevs.push(val);
      if (val < minElev) minElev = val;
      if (val > maxElev) maxElev = val;
    }
    grid.push(rowElevs);
  }

  // Calculate elevation at exact incident coordinate (34.1234°N, 77.4567°E)
  const incPx = Math.floor(((77.4567 - bbox[0]) / (bbox[2] - bbox[0])) * width);
  const incPy = Math.floor(((bbox[3] - 34.1234) / (bbox[3] - bbox[1])) * height);
  const incElev = elevData[incPy * width + incPx] ?? 4180;

  const effectiveSpacingMeters = (0.15 * 111320) / targetWidth;

  console.log(`=== Numerical Verification ===`);
  console.log(`Source Raster Dimensions: ${width} x ${height}`);
  console.log(`AOI Sample Dimensions: ${targetWidth} x ${targetHeight} (Native 30m)`);
  console.log(`Effective Source Spacing: ~${effectiveSpacingMeters.toFixed(1)} meters`);
  console.log(`AOI Bounding Box: [${minLon}°E, ${minLat}°N, ${maxLon}°E, ${maxLat}°N]`);
  console.log(`Min Elevation: ${minElev.toFixed(1)}m`);
  console.log(`Max Elevation: ${maxElev.toFixed(1)}m`);
  console.log(`Incident LKP Elevation (34.1234°N, 77.4567°E): ${incElev.toFixed(1)}m`);

  // 4. Save Native 30m Elevation Grid JSON
  const terrainJsonPath = join(OUTPUT_DIR, "dem-glo30-n34e077.json");
  const metadata = {
    dataset: "Copernicus DEM GLO-30 — native 30m source",
    tile: "N34E077",
    aoi: "High-Altitude Avalanche Search Zone (Ladakh, Himalayas)",
    bounds: [minLon, minLat, maxLon, maxLat],
    incidentLkp: { latitude: 34.1234, longitude: 77.4567, elevationM: incElev },
    gridDimensions: [targetWidth, targetHeight],
    effectiveSpacingMeters: Math.round(effectiveSpacingMeters * 10) / 10,
    elevationRangeMeters: [minElev, maxElev],
    elevations: grid,
  };

  writeFileSync(terrainJsonPath, JSON.stringify(metadata));
  console.log(`Saved N34E077 DEM grid (${(JSON.stringify(metadata).length / 1024 / 1024).toFixed(2)} MB) to ${terrainJsonPath}`);

  // 5. Generate Cesium layer.json descriptor
  const layerJson = {
    tilejson: "2.1.0",
    name: "COPERNICUS GLO-30 • N34E077 • 30m SOURCE",
    description: "Copernicus DEM GLO-30 native 30m elevation terrain for High-Altitude Avalanche Incident Sector",
    version: "1.0.0",
    format: "quantized-mesh-1.0",
    attribution: "Copernicus DEM GLO-30 / ESA / AWS Open Data",
    schema: "tms",
    bounds: [minLon, minLat, maxLon, maxLat],
    minzoom: 0,
    maxzoom: 16,
    projection: "EPSG:4326",
    tiles: ["{z}/{x}/{y}.terrain"],
  };

  writeFileSync(join(OUTPUT_DIR, "layer.json"), JSON.stringify(layerJson, null, 2));
  console.log(`Saved Cesium layer.json to ${join(OUTPUT_DIR, "layer.json")}`);
  console.log("=== N34E077 Preprocessing Complete ===");
}

main().catch(console.error);
