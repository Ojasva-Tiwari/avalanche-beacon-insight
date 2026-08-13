import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { simulationApi } from "@/lib/api";
import { DEFAULT_LAYERS } from "@/lib/mock/dataset";
import type { DemoAction, EvidenceEvent, MapLayerId, MapLayers, ScenarioId } from "@/lib/types";
import { getBaseTimeline } from "@/lib/api/mockBackend";

export interface AppSettings {
  density: "COMPACT" | "COMFORTABLE";
  units: "METRIC" | "IMPERIAL";
  updateIntervalS: number;
  alertOnP1: boolean;
  alertOnSensorLoss: boolean;
}

interface SimulationContextValue {
  scenario: ScenarioId;
  selectedZone: string;
  layers: MapLayers;
  timeline: EvidenceEvent[];
  demoMode: boolean;
  clock: string;
  settings: AppSettings;
  selectZone: (zoneId: string) => void;
  toggleLayer: (layer: MapLayerId) => void;
  setDemoMode: (on: boolean) => void;
  runDemoAction: (action: DemoAction) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
}

const SimulationContext = createContext<SimulationContextValue | null>(null);

const START_CLOCK = "10:31:02";

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [scenario, setScenario] = useState<ScenarioId>(simulationApi.initialScenario);
  const [selectedZone, setSelectedZone] = useState("B2");
  const [layers, setLayers] = useState<MapLayers>(DEFAULT_LAYERS);
  const [timeline, setTimeline] = useState<EvidenceEvent[]>(() => getBaseTimeline());
  const [clock, setClock] = useState(START_CLOCK);
  const [demoMode, setDemoMode] = useState(true);
  const [settings, setSettings] = useState<AppSettings>({
    density: "COMPACT",
    units: "METRIC",
    updateIntervalS: 5,
    alertOnP1: true,
    alertOnSensorLoss: true,
  });

  const runDemoAction = useCallback((action: DemoAction) => {
    setScenario((current) => {
      const next = simulationApi.nextScenario(current, action);
      setClock((prevClock) => {
        const events = simulationApi.timelineForAction(action, prevClock);
        if (action === "RESET_SCENARIO") {
          setTimeline([...getBaseTimeline(), ...events.map((e) => ({ ...e, timestamp: "10:31:05" }))]);
          return START_CLOCK;
        }
        if (events.length) setTimeline((t) => [...t, ...events]);
        return events.length ? simulationApi.advance(prevClock, events.length + 1) : prevClock;
      });
      return next;
    });
  }, []);

  const toggleLayer = useCallback((layer: MapLayerId) => {
    setLayers((l) => ({ ...l, [layer]: !l[layer] }));
  }, []);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((s) => ({ ...s, ...patch }));
  }, []);

  const value = useMemo<SimulationContextValue>(
    () => ({
      scenario,
      selectedZone,
      layers,
      timeline,
      demoMode,
      clock,
      settings,
      selectZone: setSelectedZone,
      toggleLayer,
      setDemoMode,
      runDemoAction,
      updateSettings,
    }),
    [scenario, selectedZone, layers, timeline, demoMode, clock, settings, toggleLayer, runDemoAction, updateSettings],
  );

  return <SimulationContext.Provider value={value}>{children}</SimulationContext.Provider>;
}

export function useSimulation() {
  const ctx = useContext(SimulationContext);
  if (!ctx) throw new Error("useSimulation must be used inside SimulationProvider");
  return ctx;
}
