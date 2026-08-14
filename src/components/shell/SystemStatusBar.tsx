import type { SystemStatus } from "@/lib/types";

function Item({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <span className="num flex items-center gap-1.5 text-[10px] tracking-wider">
      <span className="text-muted-foreground">{label}</span>
      <span className={ok ? "text-state-active" : "text-state-degraded"}>
        <span aria-hidden>{ok ? "●" : "◐"} </span>
        {value}
      </span>
    </span>
  );
}

export function SystemStatusBar({ status }: { status?: SystemStatus | undefined }) {
  return (
    <footer className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-t border-border bg-panel-header px-3 py-1.5">
      {!status ? (
        <span className="num text-[10px] tracking-wider text-muted-foreground">LOADING SYSTEM STATUS…</span>
      ) : (
        <>
          <Item label="BACKEND" value={status.backend} ok={status.backend === "ONLINE"} />
          <Item label="DATABASE" value={status.database} ok={status.database === "ONLINE"} />
          <Item label="FUSION ENGINE" value={status.fusion_engine} ok={status.fusion_engine === "READY"} />
          <Item label="WEBSOCKET" value={status.websocket} ok={status.websocket === "CONNECTED"} />
          <Item label="SENSOR STREAM" value={status.sensor_stream} ok={status.sensor_stream === "ACTIVE"} />
          <Item
            label="NETWORK MODE"
            value={status.network_mode ?? "ONLINE"}
            ok={status.network_mode === "ONLINE" || status.network_mode === "OFFLINE_CACHED"}
          />
          <span className="num ml-auto text-[10px] tracking-wider text-muted-foreground">
            MODE {status.mode} · LAST UPDATE <span className="text-foreground">{status.last_update}</span>
          </span>

        </>
      )}
    </footer>
  );
}
