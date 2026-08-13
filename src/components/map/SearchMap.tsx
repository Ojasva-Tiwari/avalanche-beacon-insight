import { Crosshair, Layers, Minus, Plus, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Tag } from "@/components/common/Panel";
import { priorityFill } from "@/lib/format";
import { RESCUER_POSITIONS, SENSOR_OBSERVATIONS } from "@/lib/mock/dataset";
import { cn } from "@/lib/utils";
import type { Incident, MapLayers, ScenarioId, SearchZone, ZoneDetails } from "@/lib/types";

/**
 * Mapbox-ready geospatial surface. The projection + layer model matches a
 * Mapbox GL source/layer setup; when VITE_MAPBOX_TOKEN is provided a Mapbox
 * basemap can be mounted underneath without touching layer logic.
 */

const VIEW_W = 640;
const VIEW_H = 460;
const MIN_ZOOM = 0.6;
const MAX_ZOOM = 8;

const CELL_LAT = 0.0003;
const CELL_LON = 0.00038;

export function SearchMap({
  incident,
  zones,
  layers,
  selectedZone,
  details,
  onSelectZone,
  scenario,
  contextEstablished = true,
}: {
  incident: Incident;
  zones: SearchZone[];
  layers: MapLayers;
  selectedZone: string;
  details?: ZoneDetails | undefined;
  onSelectZone: (zoneId: string) => void;
  scenario: ScenarioId;
  contextEstablished?: boolean | undefined;
}) {
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
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      wheelRef.current(e);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const reset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const focusZone = useCallback(
    (zone: SearchZone) => {
      const p = project(zone.latitude, zone.longitude);
      const target = 2.6;
      setZoom(target);
      setOffset({ x: -p.x * target, y: -p.y * target });
    },
    [project],
  );

  const handleSelect = (zone: SearchZone) => {
    onSelectZone(zone.zone_id);
    focusZone(zone);
  };

  const lkp = project(center.latitude, center.longitude);
  const flowRad = ((incident.avalanche_flow_bearing_deg - 90) * Math.PI) / 180;
  const flowEnd = { x: lkp.x + Math.cos(flowRad) * 150, y: lkp.y + Math.sin(flowRad) * 150 };

  const boundary = useMemo(() => {
    const pts: [number, number][] = [
      [34.1249, 77.4544],
      [34.1247, 77.4573],
      [34.1237, 77.4592],
      [34.1224, 77.4597],
      [34.1216, 77.4581],
      [34.1222, 77.4556],
      [34.1235, 77.4539],
    ];
    return pts.map(([la, lo]) => project(la, lo));
  }, [project]);

  const candidates = zones
    .filter((z) => z.priority !== null && (z.victim_probability ?? 0) >= 0.3)
    .sort((a, b) => (b.victim_probability ?? 0) - (a.victim_probability ?? 0))
    .slice(0, 3);

  const observations = SENSOR_OBSERVATIONS.filter((o) => o.scenarios.includes(scenario));
  const selected = zones.find((z) => z.zone_id === selectedZone);
  const errorM = details?.location.error_m ?? selected?.localization_error_m ?? null;

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden border border-border bg-[oklch(0.145_0.014_250)]">
      <svg
        ref={svgRef}
        role="application"
        aria-label="Avalanche search area map"
        viewBox={`${-VIEW_W / 2} ${-VIEW_H / 2} ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="xMidYMid slice"
        className={cn("size-full touch-none", drag.current ? "cursor-grabbing" : "cursor-grab")}
        onPointerDown={(e) => {
          const p = toUserSpace(e.clientX, e.clientY);
          drag.current = { x: p.x, y: p.y, ox: offset.x, oy: offset.y };
          (e.target as Element).setPointerCapture?.(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          const p = toUserSpace(e.clientX, e.clientY);
          setOffset({
            x: drag.current.ox + (p.x - drag.current.x),
            y: drag.current.oy + (p.y - drag.current.y),
          });
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerLeave={() => {
          drag.current = null;
        }}
      >
        <defs>
          <pattern id="graticule" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M32 0H0V32" fill="none" stroke="var(--grid-line)" strokeWidth="0.4" opacity="0.5" />
          </pattern>
          <marker id="flowArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
            <path d="M0 0 L10 5 L0 10 z" fill="var(--p2)" />
          </marker>
        </defs>

        <rect x={-VIEW_W} y={-VIEW_H} width={VIEW_W * 2} height={VIEW_H * 2} fill="url(#graticule)" />

        <g transform={`translate(${offset.x} ${offset.y}) scale(${zoom})`}>
          {layers.terrain && (
            <g fill="none" stroke="var(--grid-line)" strokeWidth={0.8} opacity={0.85}>
              {[40, 78, 118, 162, 210, 262].map((r, i) => (
                <ellipse key={r} cx={-30 + i * 6} cy={-60 + i * 12} rx={r * 1.35} ry={r * 0.78} transform="rotate(-18)" />
              ))}
              <text x={-176} y={-150} className="num" fontSize={7} fill="var(--muted-foreground)" stroke="none">
                4180 m
              </text>
              <text x={120} y={168} className="num" fontSize={7} fill="var(--muted-foreground)" stroke="none">
                3960 m
              </text>
            </g>
          )}

          {layers.sensor_coverage && (
            <g>
              <circle cx={lkp.x} cy={lkp.y} r={190} fill="var(--primary)" opacity={0.05} stroke="var(--primary)" strokeDasharray="4 4" strokeWidth={0.7} />
              <circle cx={flowEnd.x} cy={flowEnd.y} r={120} fill="var(--primary)" opacity={0.05} stroke="var(--primary)" strokeDasharray="4 4" strokeWidth={0.7} />
            </g>
          )}

          {layers.avalanche_boundary && contextEstablished && (
            <polygon
              points={boundary.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="oklch(0.68 0.108 232 / 0.06)"
              stroke="var(--primary)"
              strokeWidth={1.2}
              strokeDasharray="6 3"
            />
          )}

          {layers.search_grid && (
            <g>
              {zones.map((z) => {
                const p = project(z.latitude, z.longitude);
                const isSel = z.zone_id === selectedZone;
                const fill = priorityFill(z.priority);
                const prob = z.victim_probability;
                return (
                  <g key={z.zone_id}>
                    <rect
                      x={p.x - cellSize.w / 2}
                      y={p.y - cellSize.h / 2}
                      width={cellSize.w}
                      height={cellSize.h}
                      fill={prob === null ? "transparent" : fill}
                      fillOpacity={prob === null ? 0 : 0.1 + Math.min(0.55, prob * 0.6)}
                      stroke={isSel ? "var(--foreground)" : "var(--grid-line)"}
                      strokeWidth={isSel ? 1.6 : 0.5}
                      className="cursor-pointer transition-[fill-opacity]"
                      onPointerUp={(e) => {
                        e.stopPropagation();
                        handleSelect(z);
                      }}
                      role="button"
                      tabIndex={0}
                      aria-label={`Zone ${z.zone_id}, priority ${z.priority ?? "none"}, probability ${
                        prob === null ? "unknown" : `${Math.round(prob * 100)} percent`
                      }`}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") handleSelect(z);
                      }}
                    />
                    <text
                      x={p.x - cellSize.w / 2 + 2}
                      y={p.y - cellSize.h / 2 + 7}
                      fontSize={5.5}
                      className="num pointer-events-none"
                      fill="var(--foreground)"
                      opacity={0.75}
                    >
                      {z.zone_id}
                    </text>
                    {z.priority && prob !== null && prob >= 0.3 && (
                      <text
                        x={p.x}
                        y={p.y + 4}
                        fontSize={6.5}
                        textAnchor="middle"
                        className="num pointer-events-none font-semibold"
                        fill="var(--foreground)"
                      >
                        {z.priority} {Math.round(prob * 100)}%
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          )}

          {selected && errorM !== null && (
            <g>
              <circle
                cx={project(selected.latitude, selected.longitude).x}
                cy={project(selected.latitude, selected.longitude).y}
                r={Math.max(4, errorM * metersToPx * 3)}
                fill="var(--foreground)"
                fillOpacity={0.06}
                stroke="var(--foreground)"
                strokeDasharray="3 2"
                strokeWidth={0.8}
              />
            </g>
          )}

          {layers.victim_candidates &&
            candidates.map((z) => {
              const p = project(z.latitude, z.longitude);
              return (
                <g
                  key={`cand-${z.zone_id}`}
                  className="cursor-pointer"
                  onPointerUp={(e) => {
                    e.stopPropagation();
                    handleSelect(z);
                  }}
                >
                  <circle cx={p.x} cy={p.y} r={7} fill="var(--background)" stroke={priorityFill(z.priority)} strokeWidth={1.6} />
                  <circle cx={p.x} cy={p.y} r={2} fill={priorityFill(z.priority)} />
                  <rect x={p.x + 9} y={p.y - 8} width={38} height={16} rx={1.5} fill="var(--card)" stroke="var(--border)" strokeWidth={0.6} />
                  <text x={p.x + 12} y={p.y + 3.5} fontSize={7} className="num" fill={priorityFill(z.priority)}>
                    {z.priority} {Math.round((z.victim_probability ?? 0) * 100)}%
                  </text>
                </g>
              );
            })}

          {layers.sensor_observations &&
            observations.map((o) => {
              const p = project(o.latitude, o.longitude);
              return (
                <g key={o.id}>
                  <path
                    d={`M${p.x} ${p.y - 5} L${p.x + 5} ${p.y} L${p.x} ${p.y + 5} L${p.x - 5} ${p.y} Z`}
                    fill="none"
                    stroke="var(--chart-2)"
                    strokeWidth={1}
                  />
                  <text x={p.x + 7} y={p.y - 6} fontSize={5.5} className="num" fill="var(--chart-2)">
                    {o.sensor}
                  </text>
                </g>
              );
            })}

          {layers.rescuer_locations &&
            RESCUER_POSITIONS.map((r) => {
              const p = project(r.latitude, r.longitude);
              return (
                <g key={r.id}>
                  <rect x={p.x - 3.5} y={p.y - 3.5} width={7} height={7} fill="var(--foreground)" opacity={0.85} />
                  <text x={p.x + 6} y={p.y + 3} fontSize={5.5} className="num" fill="var(--foreground)" opacity={0.75}>
                    {r.id}
                  </text>
                </g>
              );
            })}

          {layers.last_known_position && (
            <g>
              <line
                x1={lkp.x}
                y1={lkp.y}
                x2={flowEnd.x}
                y2={flowEnd.y}
                stroke="var(--p2)"
                strokeWidth={1.4}
                strokeDasharray="7 4"
                markerEnd="url(#flowArrow)"
              />
              <circle cx={lkp.x} cy={lkp.y} r={5} fill="none" stroke="var(--p2)" strokeWidth={1.6} />
              <line x1={lkp.x - 9} y1={lkp.y} x2={lkp.x + 9} y2={lkp.y} stroke="var(--p2)" strokeWidth={0.9} />
              <line x1={lkp.x} y1={lkp.y - 9} x2={lkp.x} y2={lkp.y + 9} stroke="var(--p2)" strokeWidth={0.9} />
              <text x={lkp.x + 11} y={lkp.y - 8} fontSize={6.5} className="num" fill="var(--p2)">
                LKP
              </text>
            </g>
          )}
        </g>
      </svg>

      {/* Overlays */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2">
        <div className="pointer-events-auto flex flex-wrap items-center gap-1.5">
          <Tag className="border-border bg-card/90 text-muted-foreground">
            <Layers className="size-3" aria-hidden /> SEARCH GRID 6×4 · 24 CELLS
          </Tag>
          <Tag className="border-border bg-card/90 text-muted-foreground">
            FLOW {incident.avalanche_flow_bearing_deg}°
          </Tag>
          {!contextEstablished && (
            <Tag className="border-p2/50 bg-card/90 text-p2">SEARCH CONTEXT NOT ESTABLISHED</Tag>
          )}
        </div>
        <div className="pointer-events-auto flex flex-col gap-1">
          <MapButton label="Zoom in" onClick={() => zoomAt(1.4, { x: 0, y: 0 })}>
            <Plus className="size-3.5" aria-hidden />
          </MapButton>
          <MapButton label="Zoom out" onClick={() => zoomAt(1 / 1.4, { x: 0, y: 0 })}>
            <Minus className="size-3.5" aria-hidden />
          </MapButton>
          <MapButton label="Reset view" onClick={reset}>
            <RotateCcw className="size-3.5" aria-hidden />
          </MapButton>
          <MapButton
            label="Center on selected zone"
            onClick={() => {
              if (selected) focusZone(selected);
            }}
          >
            <Crosshair className="size-3.5" aria-hidden />
          </MapButton>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-2 p-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Legend color="var(--p1)" label="P1 SEARCH NOW" glyph="▲" />
          <Legend color="var(--p2)" label="P2 SECONDARY" glyph="◆" />
          <Legend color="var(--p3)" label="P3 DEFER" glyph="■" />
        </div>
        <div className="num rounded-sm border border-border bg-card/90 px-2 py-1 text-[10px] text-muted-foreground">
          SCALE ≈ {Math.round(50 / zoom)} m · ZOOM {zoom.toFixed(1)}×
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
