import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Panel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string | undefined;
}) {
  return (
    <section className={cn("panel-surface flex min-h-0 flex-col overflow-hidden", className)}>
      {children}
    </section>
  );
}

export function PanelHeader({
  title,
  right,
  icon,
}: {
  title: string;
  right?: ReactNode | undefined;
  icon?: ReactNode | undefined;
}) {
  return (
    <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-panel-header px-3 py-1.5">
      <h2 className="label-caps flex items-center gap-1.5 text-foreground/80">
        {icon}
        {title}
      </h2>
      {right}
    </header>
  );
}

export function PanelBody({ children, className }: { children: ReactNode; className?: string | undefined }) {
  return (
    <div className={cn("scroll-thin min-h-0 flex-1 overflow-y-auto p-3", className)}>{children}</div>
  );
}

export function Row({
  label,
  value,
  mono = true,
  tone,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
  tone?: string | undefined;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-[3px]">
      <span className="label-caps shrink-0">{label}</span>
      <span
        className={cn(
          "min-w-0 truncate text-right text-xs text-foreground",
          mono && "num",
          tone,
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function MetricBar({
  value,
  tone = "var(--primary)",
  label,
}: {
  value: number | null;
  tone?: string | undefined;
  label?: string | undefined;
}) {
  return (
    <div className="flex items-center gap-2" aria-label={label}>
      <div className="h-1.5 flex-1 overflow-hidden rounded-sm bg-muted">
        {value !== null && (
          <div
            className="h-full rounded-sm transition-[width] duration-500"
            style={{ width: `${Math.max(2, Math.round(value * 100))}%`, backgroundColor: tone }}
          />
        )}
      </div>
      <span className="num w-9 shrink-0 text-right text-[11px] text-foreground">
        {value === null ? "—" : `${Math.round(value * 100)}%`}
      </span>
    </div>
  );
}

export function Tag({
  children,
  className,
}: {
  children: ReactNode;
  className?: string | undefined;
}) {
  return (
    <span
      className={cn(
        "num inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[10px] font-medium tracking-wider",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Skeleton({ lines = 3 }: { lines?: number | undefined }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Loading">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-3 w-full rounded-sm bg-muted/70" />
      ))}
    </div>
  );
}

export function EmptyState({ title, detail }: { title: string; detail?: string | undefined }) {
  return (
    <div className="rounded-sm border border-dashed border-border p-3">
      <p className="num text-[11px] font-medium tracking-wider text-state-degraded">{title}</p>
      {detail && <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{detail}</p>}
    </div>
  );
}
