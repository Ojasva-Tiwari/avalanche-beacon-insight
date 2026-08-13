import { GitMerge } from "lucide-react";

import { EmptyState, MetricBar, Panel, PanelBody, PanelHeader, Skeleton, Tag } from "@/components/common/Panel";
import { pct, priorityFill, stateClass } from "@/lib/format";
import type { ZoneDetails } from "@/lib/types";

export function EvidenceFusionPanel({ details }: { details?: ZoneDetails | undefined }) {
  const contributing = details?.evidence.filter((e) => e.evidence !== null) ?? [];

  return (
    <Panel>
      <PanelHeader
        title="Evidence fusion"
        icon={<GitMerge className="size-3.5 text-primary" aria-hidden />}
        right={<Tag className="border-border bg-muted/60 text-muted-foreground">BACKEND RESULT</Tag>}
      />
      <PanelBody className="space-y-2.5 py-3">
        {!details ? (
          <Skeleton lines={5} />
        ) : (
          <>
            <p className="label-caps">Evidence per modality</p>
            {contributing.length === 0 ? (
              <EmptyState
                title="NO CURRENT EVIDENCE"
                detail="No modality returned evidence for this cell."
              />
            ) : (
              <ul className="space-y-2">
                {contributing.map((e) => (
                  <li key={e.sensor_id}>
                    <div className="flex items-center justify-between">
                      <span className="num text-[11px] tracking-wider text-foreground">{e.label}</span>
                      <span className={`num text-[10px] tracking-wider ${stateClass(e.state)}`}>{e.state}</span>
                    </div>
                    <MetricBar value={e.evidence} tone="var(--chart-1)" label={`${e.label} evidence`} />
                  </li>
                ))}
              </ul>
            )}

            {details.evidence.some((e) => e.evidence === null) && (
              <p className="text-[10px] leading-relaxed text-muted-foreground">
                Not contributing:{" "}
                {details.evidence
                  .filter((e) => e.evidence === null)
                  .map((e) => `${e.label} (${e.state})`)
                  .join(" · ")}
              </p>
            )}

            <div className="space-y-1.5 border-t border-border/60 pt-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="label-caps">Contextual prior</span>
                <span className="num text-foreground">{details.contextual_prior}</span>
              </div>
              <div>
                <span className="label-caps">Temporal consistency</span>
                <MetricBar value={details.temporal_consistency} tone="var(--chart-2)" label="Temporal consistency" />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-sm border border-border bg-muted/40 px-2.5 py-2">
              <span className="label-caps text-foreground/80">Final victim probability</span>
              <span
                className="num text-xl font-semibold"
                style={{ color: priorityFill(details.priority) }}
              >
                {pct(details.victim_probability)}
              </span>
            </div>
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              EVIDENCE is what a modality reported. QUALITY is how much that report can be trusted.
              Both are supplied by the fusion backend; the interface performs no inference.
            </p>
          </>
        )}
      </PanelBody>
    </Panel>
  );
}
