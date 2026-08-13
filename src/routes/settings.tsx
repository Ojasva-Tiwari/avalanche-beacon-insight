import { createFileRoute } from "@tanstack/react-router";

import { Panel, PanelBody, PanelHeader, Row, Tag } from "@/components/common/Panel";
import { AppShell } from "@/components/shell/AppShell";
import { simulationApi } from "@/lib/api";
import { useSimulation } from "@/lib/state/simulation";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Operator Settings — Avalanche Rescue Command System" },
      {
        name: "description",
        content:
          "Configure display density, units, refresh interval and alerting for the avalanche rescue command interface, and review the backend data source.",
      },
      { property: "og:title", content: "Operator Settings — Avalanche Rescue Command" },
      {
        property: "og:description",
        content: "Display density, units, refresh interval, alerting and data-source configuration.",
      },
    ],
  }),
  component: SettingsPage,
});

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border/50 py-1.5 last:border-0">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`num rounded-sm border px-2 py-0.5 text-[10px] tracking-wider transition-colors ${
          checked ? "border-primary/50 bg-primary/15 text-primary" : "border-border text-muted-foreground"
        }`}
      >
        {checked ? "ON" : "OFF"}
      </button>
    </div>
  );
}

function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border/50 py-1.5 last:border-0">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <div className="flex gap-1">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            aria-pressed={o === value}
            onClick={() => onChange(o)}
            className={`num rounded-sm border px-2 py-0.5 text-[10px] tracking-wider transition-colors ${
              o === value
                ? "border-primary/50 bg-primary/15 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function SettingsPage() {
  const { settings, updateSettings, demoMode, setDemoMode } = useSimulation();

  return (
    <AppShell>
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto p-2">
        <h1 className="num mb-2 text-sm tracking-[0.14em] text-foreground">OPERATOR SETTINGS</h1>

        <div className="grid grid-cols-1 gap-2 lg:grid-cols-2 xl:grid-cols-3">
          <Panel>
            <PanelHeader title="Display" />
            <PanelBody className="py-2">
              <Choice
                label="Information density"
                value={settings.density}
                options={["COMPACT", "COMFORTABLE"] as const}
                onChange={(density) => updateSettings({ density })}
              />
              <Choice
                label="Units"
                value={settings.units}
                options={["METRIC", "IMPERIAL"] as const}
                onChange={(units) => updateSettings({ units })}
              />
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader title="Updates & alerting" />
            <PanelBody className="py-2">
              <Choice
                label="Refresh interval"
                value={String(settings.updateIntervalS)}
                options={["2", "5", "10", "30"] as const}
                onChange={(v) => updateSettings({ updateIntervalS: Number(v) })}
              />
              <Toggle
                label="Alert on new P1 zone"
                checked={settings.alertOnP1}
                onChange={(alertOnP1) => updateSettings({ alertOnP1 })}
              />
              <Toggle
                label="Alert on sensor loss"
                checked={settings.alertOnSensorLoss}
                onChange={(alertOnSensorLoss) => updateSettings({ alertOnSensorLoss })}
              />
              <Toggle label="Demo / synthetic input mode" checked={demoMode} onChange={setDemoMode} />
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader
              title="Data source"
              right={
                <Tag className="border-border bg-muted/50 text-muted-foreground">
                  {simulationApi.mode}
                </Tag>
              }
            />
            <PanelBody className="py-2">
              <Row label="Mode" value={simulationApi.mode} />
              <Row label="Fusion & prioritization" value="Backend responsibility" />
              <Row label="Frontend role" value="Visualization only" />
              <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
                This interface never computes probabilities, fusion weights or priorities. In backend mode the same
                panels render responses from the Python/FastAPI service; in demo mode they render deterministic
                pre-authored scenario outputs.
              </p>
            </PanelBody>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
