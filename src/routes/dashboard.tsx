import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { PanelLeftClose, PanelRightClose } from "lucide-react";
import { useState } from "react";

import { DemoControls } from "@/components/demo/DemoControls";
import { DecisionPanel } from "@/components/decisions/DecisionPanel";
import { ZonePriorityList } from "@/components/decisions/ZonePriorityList";
import { EnvironmentPanel } from "@/components/evidence/EnvironmentPanel";
import { EvidenceFusionPanel } from "@/components/evidence/EvidenceFusionPanel";
import { EvidenceTimeline } from "@/components/evidence/EvidenceTimeline";
import { SensorQualityPanel } from "@/components/evidence/SensorQualityPanel";
import { WhyThisZone } from "@/components/evidence/WhyThisZone";
import { IncidentPanel } from "@/components/incident/IncidentPanel";
import { SearchContextPanel } from "@/components/incident/SearchContextPanel";
import { SearchMap } from "@/components/map/SearchMap";
import { SensorStatusPanel } from "@/components/sensors/SensorStatusPanel";
import { AppShell } from "@/components/shell/AppShell";
import {
  environmentQuery,
  incidentQuery,
  sensorsQuery,
  zoneDetailsQuery,
  zonesQuery,
} from "@/lib/state/queries";
import { useSimulation } from "@/lib/state/simulation";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Rescue Dashboard — Avalanche Rescue Command System" },
      {
        name: "description",
        content:
          "Live prototype command dashboard: prioritized avalanche search zones, sensor evidence fusion and recommended rescue action.",
      },
      { property: "og:title", content: "Rescue Dashboard — Avalanche Rescue Command System" },
      {
        property: "og:description",
        content:
          "Prioritized search zones, sensor evidence and the recommended rescue action for avalanche victim localization.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { scenario, selectedZone, layers, timeline, demoMode, selectZone, toggleLayer, setDemoMode, runDemoAction } =
    useSimulation();
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [isMaximized, setIsMaximized] = useState(false);

  const { data: incident } = useQuery(incidentQuery());
  const { data: env } = useQuery(environmentQuery());
  const { data: zones } = useQuery(zonesQuery(scenario));
  const { data: sensors } = useQuery(sensorsQuery(scenario));
  const { data: details } = useQuery(zoneDetailsQuery(scenario, selectedZone));

  return (
    <AppShell>
      <div className="flex min-h-0 flex-1 gap-2 overflow-hidden p-2">
        {/* LEFT: incident context + sensors */}
        {leftOpen && !isMaximized && (
          <aside className="scroll-thin hidden w-[264px] shrink-0 space-y-2 overflow-y-auto lg:block">
            <IncidentPanel incident={incident} />
            <SearchContextPanel layers={layers} onToggle={toggleLayer} />
            <SensorStatusPanel sensors={sensors} />
            <EnvironmentPanel env={env} />
            <DemoControls
              scenario={scenario}
              demoMode={demoMode}
              onToggleDemoMode={setDemoMode}
              onAction={runDemoAction}
            />
          </aside>
        )}

        {/* CENTER: map dominates */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
          {!isMaximized && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setLeftOpen((o) => !o)}
                className="num hidden items-center gap-1 rounded-sm border border-border px-2 py-1 text-[10px] tracking-wider text-muted-foreground hover:text-foreground lg:inline-flex"
              >
                <PanelLeftClose className="size-3" aria-hidden /> CONTEXT
              </button>
              <h2 className="num text-[11px] tracking-[0.14em] text-foreground/80">
                LIVE SEARCH MAP · WHERE SHOULD WE SEARCH?
              </h2>
              <button
                type="button"
                onClick={() => setRightOpen((o) => !o)}
                className="num ml-auto hidden items-center gap-1 rounded-sm border border-border px-2 py-1 text-[10px] tracking-wider text-muted-foreground hover:text-foreground xl:inline-flex"
              >
                <PanelRightClose className="size-3" aria-hidden /> DECISION
              </button>
            </div>
          )}

          {incident && zones ? (
            <SearchMap
              incident={incident}
              zones={zones}
              layers={layers}
              selectedZone={selectedZone}
              details={details}
              onSelectZone={selectZone}
              scenario={scenario}
              isMaximized={isMaximized}
              onToggleMaximize={() => setIsMaximized((m) => !m)}
            />
          ) : (
            <div className="num flex min-h-0 flex-1 items-center justify-center border border-border text-[11px] tracking-wider text-muted-foreground">
              LOADING SEARCH GRID…
            </div>
          )}

          {!isMaximized && (
            <>
              <div className="grid shrink-0 grid-cols-1 gap-2 md:grid-cols-2">
                <ZonePriorityList zones={zones} selectedZone={selectedZone} onSelect={selectZone} limit={6} />
                <EvidenceTimeline events={timeline} className="max-h-[188px]" />
              </div>

              {/* Mobile / tablet context + decision */}
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:hidden">
                <IncidentPanel incident={incident} />
                <SensorStatusPanel sensors={sensors} compact />
                <DecisionPanel details={details} />
                <DemoControls
                  scenario={scenario}
                  demoMode={demoMode}
                  onToggleDemoMode={setDemoMode}
                  onAction={runDemoAction}
                />
              </div>
            </>
          )}
        </div>

        {/* RIGHT: decision + evidence */}
        {rightOpen && !isMaximized && (
          <aside className="scroll-thin hidden w-[330px] shrink-0 space-y-2 overflow-y-auto xl:block">
            <DecisionPanel details={details} />
            <EvidenceFusionPanel details={details} />
            <WhyThisZone details={details} />
            <SensorQualityPanel details={details} />
          </aside>
        )}
      </div>
    </AppShell>
  );
}
