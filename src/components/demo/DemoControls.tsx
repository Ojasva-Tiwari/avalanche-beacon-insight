import { FlaskConical } from "lucide-react";

import { Panel, PanelBody, PanelHeader, Tag } from "@/components/common/Panel";
import { SCENARIOS } from "@/lib/mock/dataset";
import type { DemoAction, ScenarioId } from "@/lib/types";

const ACTIONS: { action: DemoAction; label: string; emphasis?: "primary" | "warn" }[] = [
  { action: "RESET_SCENARIO", label: "RESET SCENARIO" },
  { action: "GPR_DETECTION", label: "GPR DETECTION" },
  { action: "RF_DETECTION", label: "RF DETECTION", emphasis: "primary" },
  { action: "REMOVE_RF", label: "REMOVE RF", emphasis: "warn" },
  { action: "DEGRADE_GPR", label: "DEGRADE GPR", emphasis: "warn" },
  { action: "THERMAL_ANOMALY", label: "THERMAL ANOMALY" },
  { action: "CLEAR_THERMAL", label: "CLEAR THERMAL" },
  { action: "SEISMIC_EVIDENCE", label: "SEISMIC EVIDENCE" },
];

export function DemoControls({
  scenario,
  demoMode,
  onToggleDemoMode,
  onAction,
}: {
  scenario: ScenarioId;
  demoMode: boolean;
  onToggleDemoMode: (on: boolean) => void;
  onAction: (action: DemoAction) => void;
}) {
  return (
    <Panel>
      <PanelHeader
        title="Demo / synthetic sensor input"
        icon={<FlaskConical className="size-3.5 text-p2" aria-hidden />}
        right={
          <button
            type="button"
            role="switch"
            aria-checked={demoMode}
            onClick={() => onToggleDemoMode(!demoMode)}
            className={`num rounded-sm border px-2 py-0.5 text-[10px] tracking-wider transition-colors ${
              demoMode ? "border-p2/50 bg-p2/15 text-p2" : "border-border text-muted-foreground"
            }`}
          >
            DEMO MODE {demoMode ? "ON" : "OFF"}
          </button>
        }
      />
      <PanelBody className="py-2">
        <div className="grid grid-cols-2 gap-1.5">
          {ACTIONS.map((a) => (
            <button
              key={a.action}
              type="button"
              disabled={!demoMode}
              onClick={() => onAction(a.action)}
              className={`num rounded-sm border px-2 py-1.5 text-[10px] tracking-wider transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                a.emphasis === "primary"
                  ? "border-primary/50 bg-primary/15 text-primary hover:bg-primary/25"
                  : a.emphasis === "warn"
                    ? "border-p2/40 bg-p2/10 text-p2 hover:bg-p2/20"
                    : "border-border bg-muted/40 text-foreground hover:bg-accent"
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
        <div className="mt-2 flex items-start gap-2">
          <Tag className="mt-0.5 shrink-0 border-border bg-muted/50 text-muted-foreground">
            {scenario}
          </Tag>
          <p className="text-[10px] leading-relaxed text-muted-foreground">{SCENARIOS[scenario].label}</p>
        </div>
        <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">
          Deterministic pre-authored scenarios — no random values are generated.
        </p>
      </PanelBody>
    </Panel>
  );
}
