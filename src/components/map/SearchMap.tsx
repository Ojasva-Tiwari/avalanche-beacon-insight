import { Box, Crosshair, Globe, Layers, Maximize2, Minimize2, Minus, Plus, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Tag } from "@/components/common/Panel";
import { CesiumTerrainViewer } from "@/components/map/CesiumTerrainViewer";
import { priorityFill } from "@/lib/format";
import { RESCUER_POSITIONS, SENSOR_OBSERVATIONS } from "@/lib/mock/dataset";
import { cn } from "@/lib/utils";
import type { Incident, MapLayers, MapMode, ScenarioId, SearchZone, ZoneDetails } from "@/lib/types";

const MODE_DESCRIPTIONS: Record<MapMode, string> = {
  OPEN_3D: "OSM raster map • Lightweight 3D",
  COPERNICUS: "GLO-30 • 30m scientific terrain",
  "2D_GRID": "Low-resource fallback",
};

const VIEW_W = 640;
const VIEW_H = 460;
const MIN_ZOOM = 0.6;
const MAX_ZOOM = 8;

const CELL_LAT = 0.0003;
const CELL_LON = 0.00038;

export function MapSwitcherBar({
  currentMode,
  onSelectMode,
}: {
  currentMode: MapMode;
  onSelectMode: (mode: MapMode) => void;
}) {
  return (
    <div className="flex flex-col items-end gap-1 font-mono">
      <div className="flex items-center gap-1 rounded-md border border-border/80 bg-background/90 p-1 shadow-lg backdrop-blur-md">
        <button
          type="button"
          onClick={() => onSelectMode("OPEN_3D")}
          className={cn(
            "flex items-center gap-1.5 rounded px-2.5 py-1 text-[11px] font-semibold transition-colors",
            currentMode === "OPEN_3D"
              ? "border border-primary/50 bg-primary/20 text-primary shadow-sm"
              : "text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
          title="OPEN MAPS 3D: OSM raster base-map imagery + lightweight 3D terrain"
        >
          <span className="text-xs">🌐</span>
          <span>OPEN MAPS 3D</span>
        </button>


        <button
          type="button"
          onClick={() => onSelectMode("COPERNICUS")}
          className={cn(
            "flex items-center gap-1.5 rounded px-2.5 py-1 text-[11px] font-semibold transition-colors",
            currentMode === "COPERNICUS"
              ? "border border-primary/50 bg-primary/20 text-primary shadow-sm"
              : "text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
          title="COPERNICUS: GLO-30 • 30m scientific terrain"
        >
          <span className="text-xs">🏔</span>
          <span>COPERNICUS</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectMode("2D_GRID")}
          className={cn(
            "flex items-center gap-1.5 rounded px-2.5 py-1 text-[11px] font-semibold transition-colors",
            currentMode === "2D_GRID"
              ? "border border-primary/50 bg-primary/20 text-primary shadow-sm"
              : "text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
          title="2D GRID: Low-resource fallback"
        >
          <span className="text-xs">▦</span>
          <span>2D GRID</span>
        </button>
      </div>

      <div className="rounded border border-border/60 bg-background/80 px-2 py-0.5 text-center text-[9px] text-muted-foreground backdrop-blur-sm">
        {MODE_DESCRIPTIONS[currentMode]}
      </div>
    </div>
  );
}

export function SearchMap({
  incident,
  zones,
  layers,
  selectedZone,
  details,
  onSelectZone,
  scenario,
  contextEstablished = true,
  isMaximized = false,
  onToggleMaximize,
}: {
  incident: Incident;
  zones: SearchZone[];
  layers: MapLayers;
  selectedZone: string;
  details?: ZoneDetails | undefined;
  onSelectZone: (zoneId: string) => void;
  scenario: ScenarioId;
  contextEstablished?: boolean | undefined;
  isMaximized?: boolean | undefined;
  onToggleMaximize?: (() => void) | undefined;
}) {
  const [mapMode, setMapMode] = useState<MapMode>("OPEN_3D");

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const center = incident.last_known_position;
  const project = useCallback(
    (lat: number, lon: number) => ({
      x: (lon - center.longitude) * Math.cos((center.latitude * Math.PI) / 180) * 111320 * 1.9,
      y: -(lat - center.latitude) * 110540 * 1.9,
    }),
    [center.latitude, center.longitude],
  );

  const metersToPx = 1.9;

  const cellSize = useMemo(() => {
    const a = project(center.latitude, center.longitude);
    const b = project(center.latitude - CELL_LAT, center.longitude + CELL_LON);
    return { w: b.x - a.x, h: b.y - a.y };
  }, [project, center.latitude, center.longitude]);

  const toUserSpace = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const p = pt.matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }, []);

  const zoomAt = useCallback(
    (factorTarget: number, anchor: { x: number; y: number }) => {
      setZoom((z) => {
        const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, factorTarget * z));
        const k = next / z;
        setOffset((o) => ({
          x: anchor.x - (anchor.x - o.x) * k,
          y: anchor.y - (anchor.y - o.y) * k,
        }));
        return next;
      });
    },
    [],
  );

  const wheelRef = useRef<(e: WheelEvent) => void>(() => {});
  wheelRef.current = (e: WheelEvent) => {
    const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
    zoomAt(Math.exp(-dy * 0.0018), toUserSpace(e.clientX, e.clientY));
  };

  useEffect(() => {
    const node = svgRef.current;
    if (!node || mapMode !== "2D_GRID") return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      wheelRef.current(e);
    };
    node.addEventListener("wheel", handler, { passive: false });
    return () => node.removeEventListener("wheel", handler);
  }, [mapMode]);

  const reset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const focusZone = useCallback(
    (id: string) => {
      const z = zones.find((item) => item.zone_id === id);
      if (!z) return;
      const p = project(z.latitude, z.longitude);
      setOffset({ x: -p.x * zoom, y: -p.y * zoom });
    },
    [zones, project, zoom],
  );

  const selected = zones.find((z) => z.zone_id === selectedZone);
  const errorM = selected?.localization_error_m ?? details?.location.error_m ?? null;

  // 1 & 2: 3D Visualization Modes (OPEN_3D & COPERNICUS)
  if (mapMode === "OPEN_3D" || mapMode === "COPERNICUS") {
    return (
      <div className="relative flex min-h-0 flex-1 flex-col">
        {/* 3-Mode Map Switcher Header */}
        <div className="absolute right-14 top-3 z-20">
          <MapSwitcherBar currentMode={mapMode} onSelectMode={setMapMode} />
        </div>

        <CesiumTerrainViewer
          incident={incident}
          zones={zones}
          layers={layers}
          selectedZone={selectedZone}
          details={details}
          onSelectZone={onSelectZone}
          scenario={scenario}
          isMaximized={isMaximized}
          onToggleMaximize={onToggleMaximize}
          mapMode={mapMode}
          onSwitchTo2DGrid={() => setMapMode("2D_GRID")}
        />
      </div>
    );
  }

  // 3: Fallback 2D Schematic SVG Grid View
  return (
    <div
      className={cn(
        "relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-card/90 shadow-md",
        isMaximized && "fixed inset-2 z-50 rounded-lg border-2 border-primary/40 bg-background shadow-2xl",
      )}
    >
      {/* 3-Mode Map Switcher Header in 2D Mode */}
      <div className="absolute right-14 top-3 z-20">
        <MapSwitcherBar currentMode={mapMode} onSelectMode={setMapMode} />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between p-2">

        <div className="pointer-events-auto flex items-center gap-1.5">
          <Tag className="border-border bg-background/90 text-muted-foreground backdrop-blur-sm font-mono">
            SEARCH SECTOR B · 50×50 m GRID
          </Tag>
          {contextEstablished ? (
            <Tag className="border-emerald-500/40 bg-emerald-500/10 text-emerald-400 backdrop-blur-sm font-mono">
              FLOW-LINE PRIOR
            </Tag>
          ) : (
            <Tag className="border-amber-500/40 bg-amber-500/10 text-amber-400 backdrop-blur-sm font-mono">
              UNORDERED PRIORS
            </Tag>
          )}
        </div>
        <div className="pointer-events-auto flex items-center gap-1">
          {onToggleMaximize && (
            <MapButton
              label={isMaximized ? "Restore size" : "Maximize map"}
              onClick={onToggleMaximize}
            >
              {isMaximized ? <Minimize2 className="size-3.5" aria-hidden /> : <Maximize2 className="size-3.5" aria-hidden />}
            </MapButton>
          )}
        </div>

      </div>

      <div
        className="relative flex-1 cursor-grab active:cursor-grabbing"
        onMouseDown={(e) => {
          if (e.button !== 0) return;
          drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
        }}
        onMouseMove={(e) => {
          if (!drag.current) return;
          const dx = e.clientX - drag.current.x;
          const dy = e.clientY - drag.current.y;
          setOffset({ x: drag.current.ox + dx, y: drag.current.oy + dy });
        }}
        onMouseUp={() => {
          drag.current = null;
        }}
        onMouseLeave={() => {
          drag.current = null;
        }}
      >
        <svg
          ref={svgRef}
          viewBox={`${-VIEW_W / 2} ${-VIEW_H / 2} ${VIEW_W} ${VIEW_H}`}
          className="h-full w-full select-none"
        >
          <defs>
            <pattern id="bg-grid-searchmap" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-border/30" />
            </pattern>
            <filter id="glow-primary" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          <rect x={-VIEW_W} y={-VIEW_H} width={VIEW_W * 2} height={VIEW_H * 2} fill="url(#bg-grid-searchmap)" />

          <g transform={`translate(${offset.x}, ${offset.y}) scale(${zoom})`}>
            {/* Operational Routing Path Lines (LKP to Zone Centroid) */}
            {zones.map((zone) => {
              const isSel = zone.zone_id === selectedZone;
              const isHigh = zone.priority === "P1" || zone.priority === "P2" || (zone.priority as string) === "CRITICAL" || (zone.priority as string) === "HIGH";
              if (!isSel && !isHigh) return null;
              const p = project(zone.latitude, zone.longitude);
              return (
                <line
                  key={`route_${zone.zone_id}`}
                  x1={0}
                  y1={0}
                  x2={p.x}
                  y2={p.y}
                  stroke={zone.priority === "P1" || (zone.priority as string) === "CRITICAL" ? "var(--amber-400, #F59E0B)" : "var(--primary)"}
                  strokeWidth={isSel ? 2 : 1}
                  strokeDasharray="4,4"
                  opacity={isSel ? 0.9 : 0.6}
                />
              );
            })}


            {zones.map((zone) => {

              const p = project(zone.latitude, zone.longitude);
              const isSel = zone.zone_id === selectedZone;
              const fill = priorityFill(zone.priority);
              const prob = zone.victim_probability;

              return (
                <g
                  key={zone.zone_id}
                  transform={`translate(${p.x}, ${p.y})`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectZone(zone.zone_id);
                  }}
                  className="cursor-pointer"
                >
                  <rect
                    x={-cellSize.w / 2}
                    y={-cellSize.h / 2}
                    width={cellSize.w}
                    height={cellSize.h}
                    rx={2}
                    fill={fill}
                    fillOpacity={isSel ? 0.35 : prob !== null && prob > 0.4 ? 0.25 : 0.12}
                    stroke={isSel ? "var(--primary)" : fill}
                    strokeWidth={isSel ? 2 : 1}
                  />

                  <text
                    x={0}
                    y={-2}
                    textAnchor="middle"
                    className={cn(
                      "num font-mono text-[9px] font-semibold tracking-wider transition-colors",
                      isSel ? "fill-primary font-bold" : "fill-foreground/80",
                    )}
                  >
                    {zone.zone_id}
                  </text>

                  {prob !== null && (
                    <text
                      x={0}
                      y={8}
                      textAnchor="middle"
                      className="num font-mono text-[7px] fill-muted-foreground"
                    >
                      {Math.round(prob * 100)}%
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        <div className="absolute right-2 top-12 z-10 flex flex-col gap-1">
          <MapButton label="Zoom in" onClick={() => zoomAt(1.4, { x: 0, y: 0 })}>
            <Plus className="size-3.5" aria-hidden />
          </MapButton>
          <MapButton label="Zoom out" onClick={() => zoomAt(1 / 1.4, { x: 0, y: 0 })}>
            <Minus className="size-3.5" aria-hidden />
          </MapButton>
          <MapButton label="Reset view" onClick={reset}>
            <RotateCcw className="size-3.5" aria-hidden />
          </MapButton>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-2 p-2">
        <div className="pointer-events-auto flex flex-wrap items-center gap-1.5">
          <Legend color="var(--p1)" label="P1 SEARCH NOW" glyph="▲" />
          <Legend color="var(--p2)" label="P2 SECONDARY" glyph="◆" />
          <Legend color="var(--p3)" label="P3 DEFER" glyph="■" />
        </div>
        <div className="num rounded-sm border border-border bg-card/90 px-2 py-1 text-[10px] text-muted-foreground">
          SCALE ≈ {Math.round(50 / zoom)} m · ZOOM {zoom.toFixed(1)}× {isMaximized && "· MAXIMIZED"}
        </div>
      </div>
    </div>
  );
}

function MapButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="rounded-sm border border-border bg-card/90 p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      {children}
    </button>
  );
}

function Legend({ color, label, glyph }: { color: string; label: string; glyph: string }) {
  return (
    <span className="num flex items-center gap-1 rounded-sm border border-border bg-card/90 px-1.5 py-1 text-[10px]">
      <span style={{ color }} aria-hidden>
        {glyph}
      </span>
      <span className="text-muted-foreground">{label}</span>
    </span>
  );
}
