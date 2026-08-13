import { ListOrdered } from "lucide-react";

import { Panel, PanelBody, PanelHeader, Skeleton } from "@/components/common/Panel";
import { ACTION_LABEL, pct, priorityClass } from "@/lib/format";
import type { SearchZone } from "@/lib/types";

const GLYPH = { P1: "▲", P2: "◆", P3: "■" } as const;

export function ZonePriorityList({
  zones,
  selectedZone,
  onSelect,
  limit = 8,
  title = "Prioritized search zones",
}: {
  zones?: SearchZone[] | undefined;
  selectedZone: string;
  onSelect: (zoneId: string) => void;
  limit?: number | undefined;
  title?: string | undefined;
}) {
  const ranked = (zones ?? [])
    .filter((z) => z.victim_probability !== null)
    .sort((a, b) => (b.victim_probability ?? 0) - (a.victim_probability ?? 0))
    .slice(0, limit);

  return (
    <Panel>
      <PanelHeader title={title} icon={<ListOrdered className="size-3.5 text-primary" aria-hidden />} />
      <PanelBody className="py-1.5">
        {!zones ? (
          <Skeleton lines={5} />
        ) : ranked.length === 0 ? (
          <p className="num text-[10px] tracking-wider text-state-degraded">
            INSUFFICIENT EVIDENCE — NO PRIORITIZED ZONES
          </p>
        ) : (
          <ul className="divide-y divide-border/50">
            {ranked.map((z) => (
              <li key={z.zone_id}>
                <button
                  type="button"
                  onClick={() => onSelect(z.zone_id)}
                  aria-current={z.zone_id === selectedZone}
                  className={`flex w-full items-center gap-2 px-1 py-1.5 text-left transition-colors hover:bg-accent/60 ${
                    z.zone_id === selectedZone ? "bg-accent/70" : ""
                  }`}
                >
                  <span className="num w-7 shrink-0 text-[11px] font-semibold text-foreground">{z.zone_id}</span>
                  <span className="num w-9 shrink-0 text-[11px] text-foreground">{pct(z.victim_probability)}</span>
                  <span
                    className={`num shrink-0 rounded-sm border px-1.5 py-0.5 text-[9px] tracking-wider ${priorityClass(
                      z.priority,
                    )}`}
                  >
                    <span aria-hidden>{z.priority ? GLYPH[z.priority] : "·"} </span>
                    {z.priority ?? "—"}
                  </span>
                  <span className="num ml-auto truncate text-[9px] tracking-wider text-muted-foreground">
                    {ACTION_LABEL[z.recommended_action]}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </PanelBody>
    </Panel>
  );
}
