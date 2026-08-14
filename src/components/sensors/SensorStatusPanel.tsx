import { Radar } from "lucide-react";

import { Panel, PanelBody, PanelHeader, Skeleton } from "@/components/common/Panel";
import { stateClass, stateGlyph } from "@/lib/format";
import type { SensorStatus } from "@/lib/types";

export function SensorStatusPanel({
  sensors,
  compact = false,
}: {
  sensors?: SensorStatus[] | undefined;
  compact?: boolean | undefined;
}) {
  return (
    <Panel>
      <PanelHeader
        title="Sensor Telemetry Stream"
        icon={<Radar className="size-3.5 text-primary" aria-hidden />}
        right={
          <div className="flex items-center gap-1.5 font-mono text-[10px]">
            <span className="rounded bg-amber-500/10 border border-amber-500/40 px-1.5 py-0.5 text-amber-300">
              SYNTHETIC
            </span>
            <span className="num tracking-wider text-muted-foreground">
              {sensors ? `${sensors.filter((s) => s.state === "ACTIVE").length}/${sensors.length} ACTIVE` : ""}
            </span>
          </div>
        }
      />

      <PanelBody className="py-2">
        {!sensors ? (
          <Skeleton lines={6} />
        ) : (
          <ul className="divide-y divide-border/50">
            {sensors.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2 py-[5px]">
                <div className="min-w-0">
                  <p className="num text-[11px] tracking-wider text-foreground">{s.short_label}</p>
                  {!compact && (
                    <p className="truncate text-[10px] text-muted-foreground">{s.label}</p>
                  )}
                </div>
                <span
                  className={`num shrink-0 text-[10px] tracking-wider ${stateClass(s.state)}`}
                  title={`${s.label} — ${s.state}`}
                >
                  <span aria-hidden>{stateGlyph(s.state)} </span>
                  {s.state}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
          UNAVAILABLE means the modality contributed no evidence — it is not treated as 0% detection.
        </p>
      </PanelBody>
    </Panel>
  );
}
