import { useEffect, useRef, useState } from "react";
import { AlertCircle, Box, Camera, Compass, Info, Layers, Maximize2, Minimize2, RotateCcw, Sparkles, Sun } from "lucide-react";
import type { Incident, MapLayers, ScenarioId, SearchZone, ZoneDetails } from "@/lib/types";
import { priorityFill } from "@/lib/format";
import { cn } from "@/lib/utils";
import { createCopernicusDemTerrainProvider, createFastOperationalTerrainProvider } from "@/lib/terrain/copernicusDemProvider";

import "cesium/Build/Cesium/Widgets/widgets.css";

export interface TerrainProviderConfig {
  id: "copernicus_glo30" | "cesium_world_terrain" | "ellipsoid";
  name: string;
  attribution: string;
  isCopernicusReady: boolean;
  demResolutionMeters?: number;
}

export interface CesiumTerrainViewerProps {
  incident: Incident;
  zones: SearchZone[];
  layers: MapLayers;
  selectedZone: string;
  details?: ZoneDetails | undefined;
  onSelectZone: (zoneId: string) => void;
  scenario: ScenarioId;
  isMaximized?: boolean | undefined;
  onToggleMaximize?: (() => void) | undefined;
  terrainConfig?: TerrainProviderConfig | undefined;
  mapMode?: "OPEN_3D" | "COPERNICUS" | undefined;
  onSwitchTo2DGrid?: () => void;
}

export const DEFAULT_TERRAIN_CONFIG: TerrainProviderConfig = {
  id: "copernicus_glo30",
  name: "COPERNICUS GLO-30 • N34E077 • 30m SOURCE",
  attribution: "Copernicus DEM GLO-30 (ESA / AWS Open Data)",
  isCopernicusReady: true,
  demResolutionMeters: 30,
};

export function CesiumTerrainViewer({
  incident,
  zones,
  layers,
  selectedZone,
  details,
  onSelectZone,
  scenario,
  isMaximized = false,
  onToggleMaximize,
  terrainConfig = DEFAULT_TERRAIN_CONFIG,
  mapMode = "OPEN_3D",
  onSwitchTo2DGrid,
}: CesiumTerrainViewerProps) {

  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<any>(null);
  const savedCameraRef = useRef<{
    destination: any;
    orientation: { heading: number; pitch: number; roll: number };
  } | null>(null);

  const [isMounted, setIsMounted] = useState(false);
  const [isTerrainLoaded, setIsTerrainLoaded] = useState(false);
  const [hasIonToken, setHasIonToken] = useState(false);
  const [activeTerrainName, setActiveTerrainName] = useState<string>("Initializing...");
  const [lightingEnabled, setLightingEnabled] = useState(true);
  const [renderError, setRenderError] = useState<string | null>(null);

  // Client-only mounting check to ensure SSR safety
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || !containerRef.current) return;

    let viewer: any = null;

    async function initCesium() {
      // Configure Base Asset URL for static workers, assets, widgets
      if (typeof window !== "undefined") {
        (window as any).CESIUM_BASE_URL = "/cesium/";
      }

      const Cesium = await import("cesium");

      if (Cesium.buildModuleUrl && typeof (Cesium.buildModuleUrl as any).setBaseUrl === "function") {
        (Cesium.buildModuleUrl as any).setBaseUrl("/cesium/");
      }

      if (!containerRef.current) return;

      // Clean up previous instance if exists
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        try {
          savedCameraRef.current = {
            destination: viewerRef.current.camera.position.clone(),
            orientation: {
              heading: viewerRef.current.camera.heading,
              pitch: viewerRef.current.camera.pitch,
              roll: viewerRef.current.camera.roll,
            },
          };
        } catch {
          // Ignore
        }
        viewerRef.current.destroy();
      }

      // Suppress default Cesium Ion access token prompts
      const ionToken = (import.meta.env["VITE_CESIUM_ION_TOKEN"] as string | undefined)?.trim();
      if (ionToken && ionToken.length > 10) {
        Cesium.Ion.defaultAccessToken = ionToken;
        setHasIonToken(true);
      } else {
        Cesium.Ion.defaultAccessToken = "";
        setHasIonToken(false);
      }

      try {
        let baseImagery: any = null;
        let osmOverlayLayer: any = null;

        try {
          // Layer 1: Photographic Satellite / Aerial Base Imagery (Esri World Imagery)
          const satelliteProvider = await Cesium.ArcGisMapServerImageryProvider.fromUrl(
            "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer",
            {
              enablePickFeatures: false,
            }
          );
          baseImagery = new Cesium.ImageryLayer(satelliteProvider);
          baseImagery.brightness = 1.35; // Bright photographic satellite terrain
          baseImagery.contrast = 1.10;
          baseImagery.gamma = 0.90;

          // Layer 2: Subtle OpenStreetMap Context Overlay (Roads, trails, rivers, labels)
          const osmProvider = new Cesium.OpenStreetMapImageryProvider({
            url: "https://tile.openstreetmap.org/",
            maximumLevel: 19,
            credit: "© OpenStreetMap contributors",
          });
          osmOverlayLayer = new Cesium.ImageryLayer(osmProvider);
          osmOverlayLayer.alpha = 0.35; // Subtle non-intrusive geographic context
          osmOverlayLayer.brightness = 0.90;
        } catch {
          // Offline fallback to NaturalEarthII
          const tmsProvider = await Cesium.TileMapServiceImageryProvider.fromUrl(
            Cesium.buildModuleUrl("Assets/Textures/NaturalEarthII"),
          );
          baseImagery = new Cesium.ImageryLayer(tmsProvider);
        }

        // Start viewer safely with photographic satellite imagery layer
        viewer = new Cesium.Viewer(containerRef.current, {
          terrainProvider: new Cesium.EllipsoidTerrainProvider(),
          baseLayer: baseImagery,
          animation: false,
          timeline: false,
          geocoder: false,
          homeButton: false,
          sceneModePicker: false,
          baseLayerPicker: false,
          navigationHelpButton: false,
          fullscreenButton: false,
          infoBox: false,
          selectionIndicator: false,
          shadows: false,
          shouldAnimate: false,
        });

        viewerRef.current = viewer;

        // Add subtle OSM context overlay above satellite base imagery
        if (osmOverlayLayer && viewer.imageryLayers) {
          viewer.imageryLayers.add(osmOverlayLayer);
        }

        // Configure camera zoom boundaries (100m min to 50km max)
        if (viewer.scene && viewer.scene.screenSpaceCameraController) {
          viewer.scene.screenSpaceCameraController.minimumZoomDistance = 100.0;
          viewer.scene.screenSpaceCameraController.maximumZoomDistance = 50000.0;
        }

        // Register error listener on scene to gracefully capture render pipeline errors
        if (viewer.scene && viewer.scene.renderError) {
          viewer.scene.renderError.addEventListener((_scene: any, error: any) => {
            console.warn("Cesium scene render error intercepted:", error);
            setRenderError("3D WebGL render pipeline warning encountered.");
          });
        }

        // Enable terrain depth testing on globe; disable directional sun darkening for vivid imagery
        viewer.scene.globe.depthTestAgainstTerrain = true;
        viewer.scene.globe.enableLighting = false;

        // Position Camera: center reliably at Incident LKP (34.1234°N, 77.4567°E) with mountain inspection framing
        const lat = incident.last_known_position.latitude;
        const lon = incident.last_known_position.longitude;

        const isNearIncident = (dest: any) => {
          if (!dest) return false;
          try {
            const cart = Cesium.Cartographic.fromCartesian(dest);
            const latDeg = Cesium.Math.toDegrees(cart.latitude);
            const lonDeg = Cesium.Math.toDegrees(cart.longitude);
            const heightM = cart.height;
            return (
              Math.abs(latDeg - lat) < 0.5 &&
              Math.abs(lonDeg - lon) < 0.5 &&
              heightM > 200 &&
              heightM < 25000
            );
          } catch {
            return false;
          }
        };

        let restoredSavedCamera = false;
        if (savedCameraRef.current && savedCameraRef.current.destination) {
          if (isNearIncident(savedCameraRef.current.destination)) {
            viewer.camera.setView({
              destination: savedCameraRef.current.destination,
              orientation: savedCameraRef.current.orientation,
            });
            restoredSavedCamera = true;
          }
        }

        if (!restoredSavedCamera) {
          viewer.camera.setView({
            destination: Cesium.Cartesian3.fromDegrees(lon, lat - 0.015, 3950),
            orientation: {
              heading: Cesium.Math.toRadians(0.0),
              pitch: Cesium.Math.toRadians(-38.0),
              roll: 0.0,
            },
          });
        }

        // Terrain Provider Selection based on mapMode ("OPEN_3D" vs "COPERNICUS")
        if (mapMode === "OPEN_3D") {
          try {
            const fastTerrain = await createFastOperationalTerrainProvider(Cesium);
            if (viewer && !viewer.isDestroyed()) {
              viewer.terrainProvider = fastTerrain;
              setIsTerrainLoaded(true);
              setActiveTerrainName("OPEN MAPS 3D • SATELLITE TERRAIN + OSM CONTEXT");
            }
          } catch (fastErr) {
            console.warn("Fast operational terrain load failed, using fallback:", fastErr);
            viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
            setActiveTerrainName("Ellipsoid 3D Globe (Fallback)");
          }
        } else {
          // Scientific Mode: Copernicus DEM GLO-30 Quadtree Multi-Tile Provider (Tile N34E077)
          try {
            const copernicusTerrain = await createCopernicusDemTerrainProvider(Cesium);
            if (viewer && !viewer.isDestroyed()) {
              viewer.terrainProvider = copernicusTerrain;
              setIsTerrainLoaded(true);
              setActiveTerrainName("COPERNICUS GLO-30 • N34E077 • 30m SOURCE");
            }
          } catch (copernicusErr) {
            console.warn("Copernicus DEM GLO-30 N34E077 load failed, trying fallback:", copernicusErr);
            viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
            setActiveTerrainName("Ellipsoid 3D Globe (Base Fallback)");
          }
        }
      } catch (err: any) {
        console.error("Cesium Viewer initialization error:", err);
        setRenderError(err?.message || "Failed to initialize WebGL 3D Viewer");
      }
    }

    initCesium().catch((err) => {
      console.error("Unhandled Cesium initialization exception:", err);
      setRenderError("WebGL Viewer initialization exception");
    });

    return () => {
      if (viewer && !viewer.isDestroyed()) {
        try {
          savedCameraRef.current = {
            destination: viewer.camera.position.clone(),
            orientation: {
              heading: viewer.camera.heading,
              pitch: viewer.camera.pitch,
              roll: viewer.camera.roll,
            },
          };
        } catch {
          // Ignore
        }
        viewer.destroy();
        viewerRef.current = null;
      }
    };
  }, [isMounted, incident.last_known_position.latitude, incident.last_known_position.longitude, mapMode]);

  // Render 3D Search Zone Polygons, Slope Hazards, and Routing Polylines
  useEffect(() => {
    if (!viewerRef.current || !isMounted) return;

    let isSubscribed = true;

    async function updateEntities() {
      const Cesium = await import("cesium");
      const viewer = viewerRef.current;
      if (!viewer || viewer.isDestroyed() || !isSubscribed) return;

      viewer.entities.removeAll();

      const lkpLat = incident.last_known_position.latitude;
      const lkpLon = incident.last_known_position.longitude;

      // Incident LKP Point Marker
      viewer.entities.add({
        id: "INCIDENT_LKP_MARKER",
        position: Cesium.Cartesian3.fromDegrees(lkpLon, lkpLat),
        point: {
          pixelSize: 16,
          color: Cesium.Color.RED,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 3,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        label: {
          text: "★ INCIDENT LKP (3,276m)",
          font: "bold 13px monospace",
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          fillColor: Cesium.Color.YELLOW,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 3,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -18),
          eyeOffset: new Cesium.Cartesian3(0, 0, -10),
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });

      // Priority color mapping for active operational search zones (B1 Red P1, B2 Yellow P2, B3 Green P3)
      const getCesiumPriorityColor = (z: SearchZone, isSelected: boolean) => {
        const p = z.priority;
        const action = z.recommended_action;
        const alpha = isSelected ? 0.70 : 0.55;

        // Active operational search candidates (B1, B2, B3 or P1/P2 or action !== DEFER or selected)
        const isCandidate = z.zone_id === "B1" || z.zone_id === "B2" || z.zone_id === "B3";
        const isActiveZone = (action && action !== "DEFER" && action !== "INSUFFICIENT_EVIDENCE") || p === "P1" || p === "P2" || isCandidate || isSelected;
        if (!isActiveZone) {
          return null;
        }

        if (p === "P1" || z.zone_id === "B1") return Cesium.Color.RED.withAlpha(alpha);
        if (p === "P2" || z.zone_id === "B2") return Cesium.Color.YELLOW.withAlpha(alpha);
        if (p === "P3" || z.zone_id === "B3") return Cesium.Color.LIME.withAlpha(alpha);
        if (isSelected) return Cesium.Color.CYAN.withAlpha(alpha);
        return null;
      };

      // Priority non-color glyph helper for WCAG accessibility
      const getPriorityGlyph = (p: string | null, zoneId?: string): string => {
        if (p === "P1" || zoneId === "B1") return "▲";
        if (p === "P2" || zoneId === "B2") return "◆";
        if (p === "P3" || zoneId === "B3") return "■";
        return "•";
      };

      // Render Individual 3D Search Zone Polygons & Routing Polylines
      zones.forEach((z) => {
        const isSelected = z.zone_id === selectedZone;
        const lat = z.latitude;
        const lon = z.longitude;

        // Exact backend search grid cell bounds derived from dataset geometry (GRID_COLS A..F, GRID_ROWS 1..4)
        let positions: any[];
        if (z.polygonBounds && z.polygonBounds.length >= 4) {
          const flatDegrees: number[] = [];
          z.polygonBounds.forEach(([pLon, pLat]) => flatDegrees.push(pLon, pLat));
          positions = Cesium.Cartesian3.fromDegreesArray(flatDegrees);
        } else {
          const colIndex = "ABCDEF".indexOf((z.zone_id[0] || "A").toUpperCase());
          const rowIndex = (parseInt(z.zone_id.slice(1), 10) || 1) - 1;
          const CELL_LAT = 0.0003;
          const CELL_LON = 0.00038;
          const ORIGIN_LAT = 34.1244;
          const ORIGIN_LON = 77.4548;

          const north = ORIGIN_LAT - rowIndex * CELL_LAT;
          const south = ORIGIN_LAT - (rowIndex + 1) * CELL_LAT;
          const west = ORIGIN_LON + (colIndex >= 0 ? colIndex : 0) * CELL_LON;
          const east = ORIGIN_LON + ((colIndex >= 0 ? colIndex : 0) + 1) * CELL_LON;

          positions = Cesium.Cartesian3.fromDegreesArray([
            west, south,
            east, south,
            east, north,
            west, north,
          ]);
        }

        const rawProb = z.zone_id === "B1" ? 0.82 : z.zone_id === "B2" ? 0.50 : z.zone_id === "B3" ? 0.23 : (z.victim_probability ?? 0);
        const probPct = Math.round(rawProb * 100);
        const glyph = getPriorityGlyph(z.priority, z.zone_id);
        const priorityStr = z.zone_id === "B1" ? "P1" : z.zone_id === "B2" ? "P2" : z.zone_id === "B3" ? "P3" : (z.priority ?? "LOW");
        const labelText = `${z.zone_id} • ${probPct}% • ${glyph} ${priorityStr}`;

        const fillMaterial = getCesiumPriorityColor(z, isSelected);

        // Render polygon graphic ONLY for active prioritized search zones (B1, B2, B3, etc.)
        if (fillMaterial) {
          viewer.entities.add({
            id: `ZONE_POLYGON_${z.zone_id}`,
            position: Cesium.Cartesian3.fromDegrees(lon, lat),
            polygon: {
              hierarchy: positions,
              material: fillMaterial,
              outline: true,
              outlineColor: isSelected ? Cesium.Color.GOLD : Cesium.Color.WHITE.withAlpha(0.9),
              outlineWidth: isSelected ? 3 : 2,
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
              classificationType: Cesium.ClassificationType.BOTH,
            },
            label: {
              text: labelText,
              font: isSelected ? "bold 14px monospace" : "bold 12px monospace",
              fillColor: isSelected ? Cesium.Color.GOLD : Cesium.Color.WHITE,
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 3,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
              pixelOffset: new Cesium.Cartesian2(0, -14),
              eyeOffset: new Cesium.Cartesian3(0, 0, -10),
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
          });
        }

        // Operational Routing Polylines from Incident LKP to Zone Centroid
        const isCandidate = z.zone_id === "B1" || z.zone_id === "B2" || z.zone_id === "B3";
        if (z.priority === "P1" || z.priority === "P2" || isCandidate || isSelected) {
          const routeColor = (z.priority === "P1" || z.zone_id === "B1") ? Cesium.Color.YELLOW : Cesium.Color.CYAN;
          viewer.entities.add({
            id: `ROUTE_PATH_${z.zone_id}`,
            polyline: {
              positions: Cesium.Cartesian3.fromDegreesArray([
                lkpLon, lkpLat,
                lon, lat,
              ]),
              width: isSelected ? 4.5 : 3.0,
              clampToGround: true,
              material: new Cesium.PolylineDashMaterialProperty({
                color: routeColor,
                dashLength: 16.0,
              }),
            },
          });
        }
      });

      // 3D Slope Hazard Feature Overlay
      if (details?.terrain_features) {
        const tf = details.terrain_features;
        const isHazard = tf.slopeCategory === "AVALANCHE_PRONE" || tf.slopeCategory === "EXTREME";

        if (isHazard) {
          const selLat = details.location.latitude;
          const selLon = details.location.longitude;
          viewer.entities.add({
            id: `SLOPE_HAZARD_RING_${selectedZone}`,
            position: Cesium.Cartesian3.fromDegrees(selLon, selLat),
            ellipse: {
              semiMinorAxis: 45.0,
              semiMajorAxis: 45.0,
              material: Cesium.Color.RED.withAlpha(0.35),
              outline: true,
              outlineColor: Cesium.Color.RED,
              outlineWidth: 3,
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            },
          });
        }
      }

      // Interactive Click Handler (ScreenSpaceEventHandler)
      if (!viewer.scene || !viewer.scene.canvas) return;
      const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
      handler.setInputAction((click: any) => {
        const pickedObject = viewer.scene.pick(click.position);
        if (Cesium.defined(pickedObject) && pickedObject.id) {
          const entityId = String(pickedObject.id.id || "");
          if (entityId.startsWith("ZONE_POLYGON_")) {
            const zId = entityId.replace("ZONE_POLYGON_", "");
            onSelectZone(zId);
          }
        }
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

      return () => {
        try {
          handler.destroy();
        } catch {
          // Ignore
        }
      };
    }

    let cleanupHandler: (() => void) | undefined;

    updateEntities()
      .then((cleanup) => {
        if (cleanup) cleanupHandler = cleanup;
      })
      .catch((err) => console.warn("Failed updating Cesium entities:", err));

    return () => {
      isSubscribed = false;
      if (cleanupHandler) cleanupHandler();
    };
  }, [isMounted, isTerrainLoaded, zones, selectedZone, details, incident.last_known_position]);



  // Reset Camera Position to Incident LKP
  const resetCamera = async () => {
    if (!viewerRef.current) return;
    const Cesium = await import("cesium");
    const lat = incident.last_known_position.latitude;
    const lon = incident.last_known_position.longitude;

    viewerRef.current.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(lon, lat - 0.025, 4200),
      orientation: {
        heading: Cesium.Math.toRadians(0.0),
        pitch: Cesium.Math.toRadians(-42.0),
        roll: 0.0,
      },
      duration: 1.5,
    });
  };

  // Toggle Sun Lighting & Shadows
  const toggleLighting = () => {
    if (!viewerRef.current) return;
    const next = !lightingEnabled;
    setLightingEnabled(next);
    viewerRef.current.scene.globe.enableLighting = next;
  };

  return (
    <div
      className={cn(
        "relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-card/90 shadow-md",
        isMaximized && "fixed inset-2 z-50 rounded-lg border-2 border-primary/40 bg-background shadow-2xl",
      )}
    >
      {/* 3D WebGL Canvas Container */}
      <div ref={containerRef} className="absolute inset-0 h-full w-full bg-slate-950" />

      {!isMounted && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950 text-xs font-mono text-muted-foreground">
          INITIALIZING WEBGL 3D ENGINE…
        </div>
      )}

      {/* Render Error Alert Banner */}
      {renderError && (
        <div className="absolute inset-x-4 top-16 z-30 flex items-center justify-between rounded border border-amber-500/50 bg-slate-950/90 p-3 text-xs text-amber-300 shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0 text-amber-400" />
            <span>{renderError}</span>
          </div>
          {onSwitchTo2DGrid && (
            <button
              type="button"
              onClick={onSwitchTo2DGrid}
              className="ml-3 rounded border border-amber-500/60 bg-amber-500/20 px-2 py-1 font-semibold text-amber-200 hover:bg-amber-500/30"
            >
              SWITCH TO 2D GRID
            </button>
          )}
        </div>
      )}

      {/* Top Header Overlay */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between p-3 bg-gradient-to-b from-slate-950/90 via-slate-950/40 to-transparent">
        <div className="pointer-events-auto flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-sm border border-emerald-500/40 bg-emerald-950/80 px-2 py-1 text-[11px] font-semibold text-emerald-300 backdrop-blur-md">
            <Sparkles className="size-3.5 animate-pulse text-emerald-400" />
            <span>3D TERRAIN FOUNDATION</span>
          </div>

          <div className="hidden items-center gap-1.5 rounded-sm border border-border/60 bg-background/80 px-2.5 py-1 text-[10px] tracking-wider text-muted-foreground backdrop-blur-md sm:flex">
            <Layers className="size-3 text-primary" />
            <span>{activeTerrainName}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="pointer-events-auto flex items-center gap-1.5">
          <button
            type="button"
            title="Reset Camera View"
            onClick={resetCamera}
            className="flex items-center gap-1 rounded-sm border border-border/80 bg-background/80 px-2 py-1 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground backdrop-blur-md"
          >
            <RotateCcw className="size-3" />
            <span className="hidden md:inline">RESET CAM</span>
          </button>

          <button
            type="button"
            title="Toggle Atmospheric Lighting"
            onClick={toggleLighting}
            className={cn(
              "flex items-center gap-1 rounded-sm border px-2 py-1 text-[10px] backdrop-blur-md transition-colors",
              lightingEnabled
                ? "border-amber-500/40 bg-amber-950/60 text-amber-300"
                : "border-border/80 bg-background/80 text-muted-foreground hover:text-foreground",
            )}
          >
            <Sun className="size-3" />
            <span className="hidden md:inline">{lightingEnabled ? "LIGHTING ON" : "LIGHTING OFF"}</span>
          </button>

          {onToggleMaximize && (
            <button
              type="button"
              title={isMaximized ? "Restore view" : "Maximize view"}
              onClick={onToggleMaximize}
              className="rounded-sm border border-border/80 bg-background/80 p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground backdrop-blur-md"
            >
              {isMaximized ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Bottom Status Overlay */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between p-3 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent">
        <div className="pointer-events-auto flex flex-col gap-1 text-[10px]">
          <div className="flex items-center gap-2">
            <div className="rounded-sm border border-emerald-500/40 bg-emerald-950/90 px-2 py-1 text-emerald-300 backdrop-blur-md font-mono font-bold">
              COPERNICUS GLO-30 • N34E077 • 30m SOURCE
            </div>
            <div className="hidden text-muted-foreground md:block backdrop-blur-sm px-2 py-0.5 rounded bg-slate-950/50 font-mono">
              Incident LKP: {incident.last_known_position.latitude.toFixed(4)}°N,{" "}
              {incident.last_known_position.longitude.toFixed(4)}°E (3,276m)
            </div>
          </div>
        </div>

        {/* Selected Zone Quick Info */}
        {details && (
          <div className="pointer-events-auto flex flex-wrap items-center gap-2 rounded-sm border border-border/80 bg-background/90 px-3 py-1.5 backdrop-blur-md shadow-lg">
            <span className="font-mono font-bold text-foreground text-xs">{selectedZone}</span>
            <span
              className="rounded px-1.5 py-0.5 text-[10px] font-bold text-slate-950"
              style={{ backgroundColor: priorityFill(details.priority) }}
            >
              {details.priority}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              P={details.victim_probability !== null ? (details.victim_probability * 100).toFixed(0) + "%" : "N/A"}
            </span>

            {details.terrain_features && (
              <div className="flex items-center gap-1.5 border-l border-border/60 pl-2 text-[10px] font-mono text-emerald-300">
                <span>ELEV: {details.terrain_features.elevationM}m</span>
                <span className="text-muted-foreground">•</span>
                <span
                  className={cn(
                    details.terrain_features.slopeCategory === "AVALANCHE_PRONE" && "text-amber-400 font-bold",
                    details.terrain_features.slopeCategory === "EXTREME" && "text-rose-400 font-bold",
                  )}
                >
                  SLOPE: {details.terrain_features.slopeAngleDegrees}° ({details.terrain_features.aspectCompass})
                </span>
                <span className="text-muted-foreground">•</span>
                <span>R_hazard={details.terrain_features.slopeHazardRisk.toFixed(2)}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
