import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { useEffect, useState } from "react";

import { Panel, PanelBody, PanelHeader, Tag } from "@/components/common/Panel";
import { DecisionPanel } from "@/components/decisions/DecisionPanel";
import { ZonePriorityList } from "@/components/decisions/ZonePriorityList";
import { EvidenceFusionPanel } from "@/components/evidence/EvidenceFusionPanel";
import { WhyThisZone } from "@/components/evidence/WhyThisZone";
import { SearchMap } from "@/components/map/SearchMap";
import { SensorStatusPanel } from "@/components/sensors/SensorStatusPanel";
import { AppShell } from "@/components/shell/AppShell";
import { REPLAY_STEPS } from "@/lib/mock/dataset";
import {
  incidentQuery,
  sensorsQuery,
  zoneDetailsQuery,
  zonesQuery,
} from "@/lib/state/queries";
import { useSimulation } from "@/lib/state/simulation";

export const Route = createFileRoute("/replay")({
  head: () => ({
    meta: [
      { title: "Incident Replay — Avalanche Rescue Command System" },
      {
        name: "description",
        content:
          "Step through the avalanche incident timeline and watch how each new sensor detection changed zone probabilities and rescue priorities.",
      },
      { property: "og:title", content: "Incident Replay — Avalanche Rescue Command" },
      {
        property: "og:description",
        content: "Replay how sensor evidence reshaped avalanche search priorities over time.",
      },
    ],
  }),
  component: ReplayPage,
});

function ReplayPage() {
  const { selectedZone, layers, selectZone } = useSimulation();
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);

  const current = REPLAY_STEPS[Math.min(step, REPLAY_STEPS.length - 1)]!;
  const scenario = current.scenario;

  const { data: incident } = useQuery(incidentQuery());
  const { data: zones } = useQuery(zonesQuery(scenario));
  const { data: sensors } = useQuery(sensorsQuery(scenario));
  const { data: details } = useQuery(zoneDetailsQuery(scenario, selectedZone));

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setStep((s) => {
        if (s >= REPLAY_STEPS.length - 1) {
          setPlaying(false);
          return s;
        }
        return s + 1;
      });
    }, 2200);
    return () => clearInterval(id);
  }, [playing]);

  return (
    <AppShell>
      <div className="flex min-h-0 flex-1 gap-2 overflow-hidden p-2">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
          <Panel>
            <PanelHeader
              title="Incident replay"
              right={
                <Tag className="border-border bg-muted/50 text-muted-foreground">
                  STEP {step + 1}/{REPLAY_STEPS.length}
                </Tag>
              }
            />
            <PanelBody className="py-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  aria-label="Previous step"
                  onClick={() => {
                    setPlaying(false);
                    setStep((s) => Math.max(0, s - 1));
                  }}
                  className="rounded-sm border border-border p-1.5 text-muted-foreground hover:text-foreground"
                >
                  <SkipBack className="size-3.5" aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label={playing ? "Pause replay" : "Play replay"}
                  onClick={() => setPlaying((p) => !p)}
                  className="rounded-sm border border-primary/50 bg-primary/15 p-1.5 text-primary hover:bg-primary/25"
                >
                  {playing ? <Pause className="size-3.5" aria-hidden /> : <Play className="size-3.5" aria-hidden />}
                </button>
                <button
                  type="button"
                  aria-label="Next step"
                  onClick={() => {
                    setPlaying(false);
                    setStep((s) => Math.min(REPLAY_STEPS.length - 1, s + 1));
                  }}
                  className="rounded-sm border border-border p-1.5 text-muted-foreground hover:text-foreground"
                >
                  <SkipForward className="size-3.5" aria-hidden />
                </button>
                <span className="num ml-2 text-[11px] text-foreground">T+{current.t_plus_min} MIN</span>
                <span className="num ml-auto text-[10px] tracking-wider text-muted-foreground">{scenario}</span>
              </div>

              <input
                type="range"
                min={0}
                max={REPLAY_STEPS.length - 1}
                step={1}
                value={step}
                aria-label="Replay timeline"
                onChange={(e) => {
                  setPlaying(false);
                  setStep(Number(e.target.value));
                }}
                className="mt-3 w-full accent-primary"
              />

              <div className="mt-2">
                <p className="num text-[11px] tracking-wider text-foreground">{current.title}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{current.narrative}</p>
              </div>
            </PanelBody>
          </Panel>

          {incident && zones ? (
            <SearchMap
              incident={incident}
              zones={zones}
              layers={layers}
              selectedZone={selectedZone}
              details={details}
              onSelectZone={selectZone}
              scenario={scenario}
            />
          ) : (
            <div className="num flex min-h-0 flex-1 items-center justify-center border border-border text-[11px] tracking-wider text-muted-foreground">
              LOADING REPLAY…
            </div>
          )}
        </div>

        <aside className="scroll-thin hidden w-[330px] shrink-0 space-y-2 overflow-y-auto lg:block">
          <DecisionPanel details={details} />
          <ZonePriorityList zones={zones} selectedZone={selectedZone} onSelect={selectZone} limit={6} />
          <SensorStatusPanel sensors={sensors} compact />
          <EvidenceFusionPanel details={details} />
          <WhyThisZone details={details} />
        </aside>
      </div>
    </AppShell>
  );
}
