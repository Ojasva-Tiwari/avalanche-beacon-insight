import { ChevronDown, HelpCircle } from "lucide-react";
import { useState } from "react";

import { Panel, PanelBody, PanelHeader, Skeleton } from "@/components/common/Panel";
import type { ZoneDetails } from "@/lib/types";

export function WhyThisZone({ details }: { details?: ZoneDetails | undefined }) {
  const [open, setOpen] = useState(true);

  return (
    <Panel>
      <PanelHeader
        title="Why this zone?"
        icon={<HelpCircle className="size-3.5 text-primary" aria-hidden />}
        right={
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="num flex items-center gap-1 text-[10px] tracking-wider text-muted-foreground hover:text-foreground"
          >
            {open ? "COLLAPSE" : "EXPAND"}
            <ChevronDown className={`size-3 transition-transform ${open ? "" : "-rotate-90"}`} aria-hidden />
          </button>
        }
      />
      {open && (
        <PanelBody className="py-2">
          {!details ? (
            <Skeleton lines={4} />
          ) : (
            <ul className="space-y-1.5">
              {details.explanation.map((item, i) => (
                <li key={i} className="flex gap-2 text-[11px] leading-relaxed">
                  <span
                    aria-hidden
                    className={`num shrink-0 ${item.kind === "SUPPORT" ? "text-state-active" : "text-state-degraded"}`}
                  >
                    {item.kind === "SUPPORT" ? "✓" : "⚠"}
                  </span>
                  <span className="text-foreground/90">
                    <span className="sr-only">{item.kind === "SUPPORT" ? "Supporting: " : "Caution: "}</span>
                    {item.text}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
            Deterministic backend explanation. No language model is involved.
          </p>
        </PanelBody>
      )}
    </Panel>
  );
}
