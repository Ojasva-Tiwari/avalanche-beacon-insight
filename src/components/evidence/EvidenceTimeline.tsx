import { Clock } from "lucide-react";

import { Panel, PanelBody, PanelHeader, Skeleton } from "@/components/common/Panel";
import type { EvidenceEvent } from "@/lib/types";

const SOURCE_TONE: Record<string, string> = {
  RF: "text-chart-1",
  GPR: "text-chart-2",
  THERMAL: "text-chart-3",
  SEISMIC: "text-chart-5",
  FUSION: "text-primary",
  DECISION: "text-p1",
  CONTEXT: "text-muted-foreground",
  SYSTEM: "text-muted-foreground",
};

export function EvidenceTimeline({
  events,
  title = "Evidence timeline",
  className,
}: {
  events?: EvidenceEvent[];
  title?: string;
  className?: string;
}) {
  return (
    <Panel className={className}>
      <PanelHeader
        title={title}
        icon={<Clock className="size-3.5 text-primary" aria-hidden />}
        right={
          <span className="num text-[10px] tracking-wider text-muted-foreground">
            {events ? `${events.length} EVENTS` : ""}
          </span>
        }
      />
      <PanelBody className="py-2">
        {!events ? (
          <Skeleton lines={4} />
        ) : (
          <ol className="space-y-0">
            {[...events].reverse().map((e, i) => (
              <li key={`${e.timestamp}-${i}`} className="flex gap-2.5 border-l border-border pl-2.5 pb-2 last:pb-0">
                <span className="num w-14 shrink-0 text-[10px] text-muted-foreground">{e.timestamp}</span>
                <div className="min-w-0">
                  <p className="num text-[10px] tracking-wider">
                    <span className={SOURCE_TONE[e.source] ?? "text-foreground"}>{e.source}</span>
                    <span className="text-foreground"> · {e.event}</span>
                  </p>
                  <p className="text-[10px] leading-relaxed text-muted-foreground">{e.description}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </PanelBody>
    </Panel>
  );
}
