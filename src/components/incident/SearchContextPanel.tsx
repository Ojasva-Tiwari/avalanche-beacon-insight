import { Layers } from "lucide-react";

import { Panel, PanelBody, PanelHeader } from "@/components/common/Panel";
import type { MapLayerId, MapLayers } from "@/lib/types";

const LAYER_LABELS: { id: MapLayerId; label: string }[] = [
  { id: "avalanche_boundary", label: "Avalanche boundary" },
  { id: "last_known_position", label: "Last known position" },
  { id: "search_grid", label: "Search grid" },
  { id: "terrain", label: "Terrain" },
  { id: "sensor_coverage", label: "Sensor coverage" },
  { id: "victim_candidates", label: "Victim candidates" },
  { id: "sensor_observations", label: "Sensor observations" },
  { id: "rescuer_locations", label: "Rescuer locations" },
];

export function SearchContextPanel({
  layers,
  onToggle,
}: {
  layers: MapLayers;
  onToggle: (id: MapLayerId) => void;
}) {
  return (
    <Panel>
      <PanelHeader title="Search context" icon={<Layers className="size-3.5 text-primary" aria-hidden />} />
      <PanelBody className="py-2">
        <ul className="grid grid-cols-1 gap-px">
          {LAYER_LABELS.map((l) => {
            const on = layers[l.id];
            return (
              <li key={l.id}>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  onClick={() => onToggle(l.id)}
                  className="flex w-full items-center gap-2 rounded-sm px-1 py-[5px] text-left text-[11px] text-foreground transition-colors hover:bg-accent/60"
                >
                  <span
                    className={`num flex size-3.5 shrink-0 items-center justify-center rounded-[2px] border text-[8px] ${
                      on ? "border-primary bg-primary/20 text-primary" : "border-border text-transparent"
                    }`}
                    aria-hidden
                  >
                    ✓
                  </span>
                  <span className={on ? "" : "text-muted-foreground"}>{l.label}</span>
                  <span className="num ml-auto text-[9px] tracking-wider text-muted-foreground">
                    {on ? "ON" : "OFF"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </PanelBody>
    </Panel>
  );
}
