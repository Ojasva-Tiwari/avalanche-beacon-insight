import { Target } from "lucide-react";

import { EmptyState, MetricBar, Panel, PanelBody, PanelHeader, Row, Skeleton, Tag } from "@/components/common/Panel";
import { ACTION_LABEL, PRIORITY_LABEL, meters, pct, priorityClass, priorityFill } from "@/lib/format";
import type { ZoneDetails } from "@/lib/types";

const PRIORITY_GLYPH = { P1: "▲", P2: "◆", P3: "■" } as const;

export function DecisionPanel({ details }: { details?: ZoneDetails }) {
  return (
    <Panel>
      <PanelHeader
        title="Search recommendation"
        icon={<Target className="size-3.5 text-primary" aria-hidden />}
        right={details ? <Tag className="border-border bg-muted/60 text-muted-foreground">ZONE {details.zone}</Tag> : null}
      />
      <PanelBody className="space-y-3 py-3">
        {!details ? (
          <Skeleton lines={6} />
        ) : details.victim_probability === null || details.priority === null ? (
          <EmptyState
            title={details.status_note ?? "INSUFFICIENT EVIDENCE"}
            detail="ADDITIONAL SENSOR INPUT REQUIRED — the backend did not return a probability for this cell. Missing data is not converted to 0%."
          />
        ) : (
          <>
            <div>
              <p className="label-caps">Simulated victim probability</p>
              <div className="mt-1 flex items-end gap-3">
                <span className="num text-4xl leading-none font-semibold text-foreground">
                  {pct(details.victim_probability)}
                </span>
                <span
                  className={`num mb-1 inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 text-[11px] font-semibold tracking-wider ${priorityClass(
                    details.priority,
                  )}`}
                >
                  <span aria-hidden>{PRIORITY_GLYPH[details.priority]}</span>
                  {details.priority} — {PRIORITY_LABEL[details.priority]}
                </span>
              </div>
              <div className="mt-2">
                <MetricBar
                  value={details.victim_probability}
                  tone={priorityFill(details.priority)}
                  label="Simulated victim probability"
                />
              </div>
            </div>

            <div className="border-t border-border/60 pt-2">
              <Row label="Estimated depth" value={meters(details.estimated_depth_m, "~")} />
              <Row label="Location uncertainty" value={meters(details.location.error_m, "±")} />
              <Row
                label="Coordinates"
                value={`${details.location.latitude.toFixed(4)}° N ${details.location.longitude.toFixed(4)}° E`}
              />
              <Row label="Contextual prior" value={details.contextual_prior} />
              <Row label="Temporal consistency" value={pct(details.temporal_consistency)} />
            </div>

            <div className="rounded-sm border border-primary/40 bg-primary/10 p-2.5">
              <p className="label-caps text-primary/90">Recommended rescue action</p>
              <p className="num mt-1 text-lg leading-tight font-semibold text-foreground">
                {ACTION_LABEL[details.recommended_action]}
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Action selected by the decision backend — not computed in the interface.
              </p>
            </div>

            <div>
              <p className="label-caps">Other possible actions</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {details.alternative_actions.map((a) => (
                  <Tag key={a} className="border-border bg-muted/50 text-muted-foreground">
                    {ACTION_LABEL[a]}
                  </Tag>
                ))}
              </div>
            </div>

            {details.status_note && (
              <EmptyState title={details.status_note} />
            )}
          </>
        )}
      </PanelBody>
    </Panel>
  );
}
