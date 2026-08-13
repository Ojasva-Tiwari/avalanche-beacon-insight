import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { useState } from "react";

import { MetricBar, Panel, PanelBody, PanelHeader, Row, Skeleton } from "@/components/common/Panel";
import { meters, pct, stateClass, stateGlyph } from "@/lib/format";
import type { SensorEvidence, ZoneDetails } from "@/lib/types";

export function SensorQualityPanel({ details }: { details?: ZoneDetails | undefined }) {
  return (
    <Panel>
      <PanelHeader
        title="Sensor quality"
        icon={<SlidersHorizontal className="size-3.5 text-primary" aria-hidden />}
      />
      <PanelBody className="space-y-1.5 py-2">
        {!details ? <Skeleton lines={4} /> : details.evidence.map((e) => <SensorCard key={e.sensor_id} e={e} />)}
      </PanelBody>
    </Panel>
  );
}

function SensorCard({ e }: { e: SensorEvidence }) {
  const [open, setOpen] = useState(e.sensor_id === "rf" || e.sensor_id === "gpr");
  const unavailable = e.evidence === null;

  return (
    <div className="rounded-sm border border-border bg-card/60">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-2 py-1.5 text-left"
      >
        <ChevronDown
          className={`size-3.5 shrink-0 text-muted-foreground transition-transform ${open ? "" : "-rotate-90"}`}
          aria-hidden
        />
        <span className="num text-[11px] tracking-wider text-foreground">{e.label}</span>
        <span className={`num ml-auto text-[10px] tracking-wider ${stateClass(e.state)}`}>
          <span aria-hidden>{stateGlyph(e.state)} </span>
          {e.state}
        </span>
        <span className="num w-9 text-right text-[11px] text-foreground">{pct(e.evidence)}</span>
      </button>

      {open && (
        <div className="space-y-1 border-t border-border/60 px-2 py-2">
          {unavailable ? (
            <p className="num text-[10px] tracking-wider text-muted-foreground">
              NO EVIDENCE CONTRIBUTED — MODALITY {e.state}
            </p>
          ) : (
            <>
              <div>
                <span className="label-caps">Evidence</span>
                <MetricBar value={e.evidence} tone="var(--chart-1)" label={`${e.label} evidence`} />
              </div>
              <div>
                <span className="label-caps">Signal quality</span>
                <MetricBar value={e.signal_quality} tone="var(--chart-2)" label={`${e.label} signal quality`} />
              </div>
              {e.environmental_quality !== null && (
                <div>
                  <span className="label-caps">Environmental quality</span>
                  <MetricBar
                    value={e.environmental_quality}
                    tone="var(--chart-3)"
                    label={`${e.label} environmental quality`}
                  />
                </div>
              )}
              {e.interference !== null && (
                <div>
                  <span className="label-caps">Interference</span>
                  <MetricBar value={e.interference} tone="var(--chart-4)" label={`${e.label} interference`} />
                </div>
              )}
              {e.visibility && <Row label="Visibility" value={e.visibility} />}
              {e.estimated_depth_m !== null && (
                <Row label="Estimated depth" value={meters(e.estimated_depth_m, "~")} />
              )}
              <Row label="Localization error" value={meters(e.localization_error_m, "±")} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
