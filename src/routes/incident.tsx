import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { Panel, PanelBody, PanelHeader, Row, Skeleton, Tag } from "@/components/common/Panel";
import { DecisionPanel } from "@/components/decisions/DecisionPanel";
import { ZonePriorityList } from "@/components/decisions/ZonePriorityList";
import { EnvironmentPanel } from "@/components/evidence/EnvironmentPanel";
import { EvidenceTimeline } from "@/components/evidence/EvidenceTimeline";
import { WhyThisZone } from "@/components/evidence/WhyThisZone";
import { IncidentPanel } from "@/components/incident/IncidentPanel";
import { SensorStatusPanel } from "@/components/sensors/SensorStatusPanel";
import { AppShell } from "@/components/shell/AppShell";
import { ACTION_LABEL, bearingLabel, coord, meters, pct, priorityClass } from "@/lib/format";
import {
  environmentQuery,
  incidentQuery,
  sensorsQuery,
  zoneDetailsQuery,
  zonesQuery,
} from "@/lib/state/queries";
import { useSimulation } from "@/lib/state/simulation";

export const Route = createFileRoute("/incident")({
  head: () => ({
    meta: [
      { title: "Incident INC-2026-001 — Avalanche Rescue Command System" },
      {
        name: "description",
        content:
          "Full incident record: avalanche boundary, last-known position, sensor availability, search zones, evidence history and current recommendation.",
      },
      { property: "og:title", content: "Incident INC-2026-001 — Avalanche Rescue Command" },
      {
        property: "og:description",
        content: "Avalanche incident context, sensor availability and current rescue recommendation.",
      },
    ],
  }),
  component: IncidentPage,
});

function IncidentPage() {
  const { scenario, selectedZone, selectZone, timeline } = useSimulation();
  const { data: incident } = useQuery(incidentQuery());
  const { data: env } = useQuery(environmentQuery());
  const { data: zones } = useQuery(zonesQuery(scenario));
  const { data: sensors } = useQuery(sensorsQuery(scenario));
  const { data: details } = useQuery(zoneDetailsQuery(scenario, selectedZone));

  const candidates = (zones ?? [])
    .filter((z) => (z.victim_probability ?? 0) >= 0.3)
    .sort((a, b) => (b.victim_probability ?? 0) - (a.victim_probability ?? 0));

  return (
    <AppShell>
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto p-2">
        <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="num text-sm tracking-[0.14em] text-foreground">INCIDENT RECORD</h1>
          <p className="text-[11px] text-muted-foreground">
            Same data model as the dashboard — no duplicate dataset.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
          <div className="space-y-2">
            <IncidentPanel incident={incident} />
            <Panel>
              <PanelHeader title="Search context & terrain" />
              <PanelBody className="py-2">
                {!incident ? (
                  <Skeleton lines={5} />
                ) : (
                  <>
                    <Row
                      label="Last-known position"
                      value={coord(incident.last_known_position.latitude, incident.last_known_position.longitude)}
                    />
                    <Row
                      label="Avalanche flow"
                      value={`${incident.avalanche_flow_bearing_deg}° ${bearingLabel(incident.avalanche_flow_bearing_deg)}`}
                    />
                    <Row label="Deposition zone" value="13 of 24 grid cells" />
                    <Row label="Search grid" value="6 × 4 cells · ≈420 m² per cell" />
                    <Row label="Terrain" value="Lee slope, 32° incline" />
                    <Row label="Search area" value="≈10,000 m² initial" />
                  </>
                )}
              </PanelBody>
            </Panel>
            <EnvironmentPanel env={env} />
          </div>

          <div className="space-y-2">
            <SensorStatusPanel sensors={sensors} />
            <ZonePriorityList
              zones={zones}
              selectedZone={selectedZone}
              onSelect={selectZone}
              limit={24}
              title="Current search zones"
            />
          </div>

          <div className="space-y-2">
            <DecisionPanel details={details} />
            <Panel>
              <PanelHeader
                title="Current victim candidates"
                right={<Tag className="border-p2/40 bg-p2/10 text-p2">SIMULATED</Tag>}
              />
              <PanelBody className="py-2">
                {candidates.length === 0 ? (
                  <p className="num text-[10px] tracking-wider text-state-degraded">
                    NO CANDIDATES ABOVE REPORTING THRESHOLD
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {candidates.map((z, i) => (
                      <li key={z.zone_id} className="flex items-center gap-2 text-[11px]">
                        <span className="num w-12 text-muted-foreground">CAND-{i + 1}</span>
                        <button
                          type="button"
                          onClick={() => selectZone(z.zone_id)}
                          className="num text-foreground underline-offset-2 hover:underline"
                        >
                          {z.zone_id}
                        </button>
                        <span className="num">{pct(z.victim_probability)}</span>
                        <span
                          className={`num rounded-sm border px-1.5 py-0.5 text-[9px] tracking-wider ${priorityClass(z.priority)}`}
                        >
                          {z.priority}
                        </span>
                        <span className="num ml-auto text-[10px] text-muted-foreground">
                          {meters(z.localization_error_m, "±")}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </PanelBody>
            </Panel>
            <WhyThisZone details={details} />
            <EvidenceTimeline events={timeline} title="Evidence & search history" />
            <Panel>
              <PanelHeader title="Current recommendation" />
              <PanelBody className="py-2">
                {details ? (
                  <Row label="Action" value={ACTION_LABEL[details.recommended_action]} />
                ) : (
                  <Skeleton lines={1} />
                )}
              </PanelBody>
            </Panel>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
