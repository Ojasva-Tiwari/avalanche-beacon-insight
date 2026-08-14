import { Link } from "@tanstack/react-router";
import { Activity, Cog, Mountain, Radio, Wifi } from "lucide-react";
import { useEffect, useState } from "react";

import { Tag } from "@/components/common/Panel";
import { USE_MOCK_API } from "@/lib/api";
import { useSimulation } from "@/lib/state/simulation";

const NAV = [
  { to: "/dashboard", label: "DASHBOARD" },
  { to: "/incident", label: "INCIDENT" },
  { to: "/replay", label: "REPLAY" },
  { to: "/analytics", label: "ANALYTICS" },
  { to: "/settings", label: "SETTINGS" },
] as const;

function useWallClock() {
  const [now, setNow] = useState<string>("--:--:--");
  useEffect(() => {
    const tick = () => setNow(new Date().toLocaleTimeString("en-GB", { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function CommandHeader() {
  const { demoMode } = useSimulation();
  const now = useWallClock();

  return (
    <header className="shrink-0 border-b border-border bg-panel-header">
      {/* Global Top Synthetic Mode Indicator Banner */}
      <div className="flex items-center justify-between border-b border-amber-500/40 bg-amber-950/80 px-3 py-1 text-[11px] font-mono text-amber-200 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="inline-block size-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="font-bold">DEMO / SYNTHETIC MODE</span>
          <span className="text-amber-400/80">•</span>
          <span>SIMULATED SENSORS &amp; INCIDENT DATA</span>
        </div>
        <div className="text-[10px] text-amber-300/80 font-bold">
          NOT PHYSICAL FIELD VALIDATED (dataMode: SYNTHETIC)
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2">

        <div className="flex items-center gap-2.5">
          <Mountain className="size-5 text-primary" aria-hidden />
          <div className="leading-tight">
            <h1 className="num text-[13px] font-semibold tracking-[0.14em] text-foreground">
              AVALANCHE RESCUE COMMAND
            </h1>
            <p className="text-[11px] text-muted-foreground">
              Victim Localization &amp; Rescue Decision Support
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Tag className="border-border bg-muted/60 text-muted-foreground">INC-2026-001</Tag>
          <Tag className="border-p1/50 bg-p1/10 text-p1">
            <span aria-hidden>●</span> ACTIVE INCIDENT
          </Tag>
          <Tag className="border-state-active/40 bg-state-active/10 text-state-active">
            <span aria-hidden>●</span> SYSTEM ONLINE
          </Tag>
          {demoMode && (
            <Tag className="border-p2/50 bg-p2/10 text-p2">DEMO / SYNTHETIC SENSOR INPUT</Tag>
          )}
        </div>

        <div className="ml-auto flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Radio className="size-3.5" aria-hidden />
            {USE_MOCK_API ? "MOCK API" : "FASTAPI"}
          </span>
          <span className="flex items-center gap-1">
            <Wifi className="size-3.5 text-state-active" aria-hidden /> CONNECTED
          </span>
          <span className="flex items-center gap-1">
            <Activity className="size-3.5 text-state-active" aria-hidden /> HEALTH OK
          </span>
          <span className="num text-foreground">{now}</span>
          <Link
            to="/settings"
            className="rounded-sm border border-border p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Operator settings"
          >
            <Cog className="size-3.5" aria-hidden />
          </Link>
        </div>
      </div>

      <nav aria-label="Primary" className="flex gap-px overflow-x-auto border-t border-border px-2">
        {NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="num border-b-2 border-transparent px-3 py-1.5 text-[11px] tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground"
            activeProps={{ className: "border-primary text-foreground bg-accent/40" }}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
