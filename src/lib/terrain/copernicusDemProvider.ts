/**
 * Copernicus DEM GLO-30 Quadtree Multi-Tile Terrain Provider for CesiumJS
 * SOURCE OF TRUTH: Copernicus DEM GLO-30 (ESA / AWS Open Data) Tile N34E077
 * Incident LKP: 34.1234°N, 77.4567°E
 * AOI Bounds: 34.05°N - 34.20°N, 77.38°E - 77.53°E (Native 30m spacing: ~30.9m)
 * Elevation Range: 3118.7m to 5204.7m
 */

export interface CopernicusDemMetadata {
  dataset: string;
  tile: string;
  aoi: string;
  bounds: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  incidentLkp: { latitude: number; longitude: number; elevationM: number };
  gridDimensions: [number, number]; // [width, height]
  effectiveSpacingMeters: number;
  elevationRangeMeters: [number, number];
  elevations: number[][];
}

export function getCopernicusStats(): { requestedTilesCount: number } {
  return { requestedTilesCount: globalTileRequestCount };
}

let globalTileRequestCount = 0;

/**
 * Creates a Cesium-compatible Quadtree Multi-Tile Terrain Provider
 * backed by native 30m Copernicus DEM GLO-30 elevation data (Tile N34E077).
 */
export async function createCopernicusDemTerrainProvider(Cesium: any): Promise<any> {
  const response = await fetch("/terrain/copernicus-glo30/dem-glo30-n34e077.json");
  if (!response.ok) {
    throw new Error(`Failed to load Copernicus N34E077 DEM metadata: HTTP ${response.status}`);
  }

  const meta: CopernicusDemMetadata = await response.json();
  const [minLon, minLat, maxLon, maxLat] = meta.bounds;
  const [gridW, gridH] = meta.gridDimensions;
  const elevations = meta.elevations;

  // Exact 30m sampling from N34E077 raster grid with smooth boundary feathering
  function sampleNativeElevation(lat: number, lon: number): number {
    if (lat < minLat || lat > maxLat || lon < minLon || lon > maxLon) {
      return 0.0;
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
    const rawElev = top * (1 - dr) + bottom * dr;

    // Smooth mathematical boundary feathering (1.0 inside core AOI, tapering to 0.0 at outer DEM border)
    const marginLat = 0.012;
    const marginLon = 0.012;
    const weightLat = Math.min(1.0, Math.max(0.0, Math.min(lat - minLat, maxLat - lat) / marginLat));
    const weightLon = Math.min(1.0, Math.max(0.0, Math.min(lon - minLon, maxLon - lon) / marginLon));
    const weight = weightLat * weightLon;

    return rawElev * weight;
  }

  const tilingScheme = new Cesium.GeographicTilingScheme();

  class CopernicusQuadtreeTerrainProvider {
    public errorEvent = new Cesium.Event();
    public credit = new Cesium.Credit("Copernicus DEM GLO-30 — native 30m source (Tile N34E077)");
    public hasWaterMask = false;
    public hasVertexNormals = true;
    public isReady = true;
    public ready = true;
    public readyPromise = Promise.resolve(true);
    public availability = undefined;

    get tilingScheme() {
      return tilingScheme;
    }

    public getLevelMaximumGeometricError(level: number): number {
      return 35000 / Math.pow(2, level);
    }

    public getTileDataAvailable(x: number, y: number, level: number): boolean | undefined {
      if (level > 14) return false;
      const rectangle = tilingScheme.tileXYToRectangle(x, y, level);
      const south = Cesium.Math.toDegrees(rectangle.south);
      const north = Cesium.Math.toDegrees(rectangle.north);
      const west = Cesium.Math.toDegrees(rectangle.west);
      const east = Cesium.Math.toDegrees(rectangle.east);
      const margin = 0.02;
      return !(east < minLon - margin || west > maxLon + margin || north < minLat - margin || south > maxLat + margin);
    }

    public loadTileDataAvailability(_x: number, _y: number, _level: number): undefined | Promise<void> {
      return undefined;
    }

    public requestTileGeometry(x: number, y: number, level: number, _request?: any): Promise<any> {
      globalTileRequestCount++;
      const tileWidth = 32;
      const tileHeight = 32;
      const buffer = new Float32Array(tileWidth * tileHeight);

      const rectangle = tilingScheme.tileXYToRectangle(x, y, level);
      const south = Cesium.Math.toDegrees(rectangle.south);
      const north = Cesium.Math.toDegrees(rectangle.north);
      const west = Cesium.Math.toDegrees(rectangle.west);
      const east = Cesium.Math.toDegrees(rectangle.east);

      const intersectsAoi = !(east < minLon || west > maxLon || north < minLat || south > maxLat);

      for (let r = 0; r < tileHeight; r++) {
        const lat = north - (r / (tileHeight - 1)) * (north - south);
        for (let c = 0; c < tileWidth; c++) {
          const lon = west + (c / (tileWidth - 1)) * (east - west);
          buffer[r * tileWidth + c] = sampleNativeElevation(lat, lon);
        }
      }

      const terrainData = new Cesium.HeightmapTerrainData({
        buffer,
        width: tileWidth,
        height: tileHeight,
        childTileMask: intersectsAoi && level < 14 ? 15 : 0,
        structure: {
          heightScale: 1.0,
          heightOffset: 0.0,
          elementsPerHeight: 1,
          stride: 1,
          elementMultiplier: 1.0,
          isBigEndian: false,
        },
      });

      return Promise.resolve(terrainData);
    }
  }

  return new CopernicusQuadtreeTerrainProvider();
}

/**
 * Creates a fast operational 3D terrain provider for OPEN MAPS 3D.
 * Backed by native GLO-30 DEM elevation data (3118m - 5204m around Khardung Pass),
 * capped at quadtree level 12 for smooth, fast operational rendering.
 */
export async function createFastOperationalTerrainProvider(Cesium: any): Promise<any> {
  const response = await fetch("/terrain/copernicus-glo30/dem-glo30-n34e077.json");
  if (!response.ok) {
    throw new Error(`Failed to load Copernicus N34E077 DEM metadata: HTTP ${response.status}`);
  }

  const meta: CopernicusDemMetadata = await response.json();
  const [minLon, minLat, maxLon, maxLat] = meta.bounds;
  const [gridW, gridH] = meta.gridDimensions;
  const elevations = meta.elevations;

  function sampleNativeElevation(lat: number, lon: number): number {
    if (lat < minLat || lat > maxLat || lon < minLon || lon > maxLon) {
      return 0.0;
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
    const rawElev = top * (1 - dr) + bottom * dr;

    const marginLat = 0.012;
    const marginLon = 0.012;
    const weightLat = Math.min(1.0, Math.max(0.0, Math.min(lat - minLat, maxLat - lat) / marginLat));
    const weightLon = Math.min(1.0, Math.max(0.0, Math.min(lon - minLon, maxLon - lon) / marginLon));
    const weight = weightLat * weightLon;

    return rawElev * weight;
  }

  const tilingScheme = new Cesium.GeographicTilingScheme();

  class FastOperationalTerrainProvider {
    public errorEvent = new Cesium.Event();
    public credit = new Cesium.Credit("Copernicus DEM GLO-30 — Fast Operational 3D Surface");
    public hasWaterMask = false;
    public hasVertexNormals = true;
    public isReady = true;
    public ready = true;
    public readyPromise = Promise.resolve(true);
    public availability = undefined;

    get tilingScheme() {
      return tilingScheme;
    }

    public getLevelMaximumGeometricError(level: number): number {
      return 35000 / Math.pow(2, level);
    }

    public getTileDataAvailable(x: number, y: number, level: number): boolean | undefined {
      if (level > 12) return false;
      const rectangle = tilingScheme.tileXYToRectangle(x, y, level);
      const south = Cesium.Math.toDegrees(rectangle.south);
      const north = Cesium.Math.toDegrees(rectangle.north);
      const west = Cesium.Math.toDegrees(rectangle.west);
      const east = Cesium.Math.toDegrees(rectangle.east);
      const margin = 0.02;
      return !(east < minLon - margin || west > maxLon + margin || north < minLat - margin || south > maxLat + margin);
    }

    public loadTileDataAvailability(_x: number, _y: number, _level: number): undefined | Promise<void> {
      return undefined;
    }

    public requestTileGeometry(x: number, y: number, level: number, _request?: any): Promise<any> {
      globalTileRequestCount++;
      const tileWidth = 16;
      const tileHeight = 16;
      const buffer = new Float32Array(tileWidth * tileHeight);

      const rectangle = tilingScheme.tileXYToRectangle(x, y, level);
      const south = Cesium.Math.toDegrees(rectangle.south);
      const north = Cesium.Math.toDegrees(rectangle.north);
      const west = Cesium.Math.toDegrees(rectangle.west);
      const east = Cesium.Math.toDegrees(rectangle.east);

      const intersectsAoi = !(east < minLon || west > maxLon || north < minLat || south > maxLat);

      for (let r = 0; r < tileHeight; r++) {
        const lat = north - (r / (tileHeight - 1)) * (north - south);
        for (let c = 0; c < tileWidth; c++) {
          const lon = west + (c / (tileWidth - 1)) * (east - west);
          buffer[r * tileWidth + c] = sampleNativeElevation(lat, lon);
        }
      }

      const terrainData = new Cesium.HeightmapTerrainData({
        buffer,
        width: tileWidth,
        height: tileHeight,
        childTileMask: intersectsAoi && level < 12 ? 15 : 0,
        structure: {
          heightScale: 1.0,
          heightOffset: 0.0,
          elementsPerHeight: 1,
          stride: 1,
          elementMultiplier: 1.0,
          isBigEndian: false,
        },
      });

      return Promise.resolve(terrainData);
    }
  }

  return new FastOperationalTerrainProvider();
}


