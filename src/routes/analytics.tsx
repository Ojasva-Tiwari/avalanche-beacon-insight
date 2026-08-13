import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { MetricBar, Panel, PanelBody, PanelHeader, Row, Skeleton, Tag } from "@/components/common/Panel";
import { AppShell } from "@/components/shell/AppShell";
import { ACTION_LABEL, meters, pct } from "@/lib/format";
import { ANALYTICS_DISCLAIMER } from "@/lib/mock/dataset";
import { analyticsQuery } from "@/lib/state/queries";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Prototype Analytics — Avalanche Rescue Command System" },
      {
        name: "description",
        content:
          "Controlled-scenario analytics for the avalanche rescue prototype: search-area reduction, localization accuracy and robustness under sensor degradation.",
      },
      { property: "og:title", content: "Prototype Analytics — Avalanche Rescue Command" },
      {
        property: "og:description",
        content: "Search-area reduction, localization accuracy and sensor-degradation robustness from controlled scenarios.",
      },
    ],
  }),
  component: AnalyticsPage,
});

const AXIS = { stroke: "oklch(0.62 0.02 240)", fontSize: 10 } as const;

export function TooltipBox({ active, payload, label }: { active?: boolean; payload?: { name?: string; value?: number | string }[]; label?: string | number }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="num rounded-sm border border-border bg-popover px-2 py-1 text-[10px] text-popover-foreground shadow-lg">
      <p className="text-muted-foreground">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-foreground">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

function AnalyticsPage() {
  const { data } = useQuery(analyticsQuery());

  return (
    <AppShell>
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto p-2">
        <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="num text-sm tracking-[0.14em] text-foreground">PROTOTYPE ANALYTICS</h1>
          <Tag className="border-p2/40 bg-p2/10 text-p2">SIMULATED SCENARIOS</Tag>
        </div>

        {!data ? (
          <Panel>
            <PanelBody>
              <Skeleton lines={8} />
            </PanelBody>
          </Panel>
        ) : (
          <div className="grid grid-cols-1 gap-2 xl:grid-cols-3">
            <Panel>
              <PanelHeader title="Search area reduction" />
              <PanelBody className="py-2">
                <Row label="Initial search area" value={`${data.search_area.initial_m2.toLocaleString()} m²`} />
                <Row label="Prioritized area" value={`${data.search_area.prioritized_m2.toLocaleString()} m²`} />
                <Row label="Reduction" value={`${data.search_area.reduction_pct}%`} />
                <div className="mt-2">
                  <MetricBar label="Area reduction" value={data.search_area.reduction_pct / 100} tone="p1" />
                </div>
              </PanelBody>
            </Panel>

            <Panel>
              <PanelHeader title="Localization accuracy" />
              <PanelBody className="py-2">
                <Row label="Top-1 zone success" value={pct(data.localization.top1_success_pct / 100)} />
                <Row label="Top-3 recall" value={pct(data.localization.top3_recall_pct / 100)} />
                <Row label="Mean error" value={meters(data.localization.mean_error_m, "±")} />
                <Row label="Median error" value={meters(data.localization.median_error_m, "±")} />
                <Row label="Worst case" value={meters(data.localization.max_error_m, "±")} />
              </PanelBody>
            </Panel>

            <Panel>
              <PanelHeader title="Priority progression" />
              <PanelBody className="py-2">
                <ul className="space-y-1.5">
                  {data.priority_progression.map((p) => (
                    <li key={p.stage} className="flex items-center gap-2 text-[11px]">
                      <span className="num w-24 shrink-0 text-muted-foreground">{p.stage}</span>
                      <span className="num w-8 text-foreground">{p.priority ?? "—"}</span>
                      <span className="text-[10px] text-muted-foreground">{p.label}</span>
                    </li>
                  ))}
                </ul>
              </PanelBody>
            </Panel>

            <Panel className="xl:col-span-2">
              <PanelHeader title="Localization error by scenario" />
              <PanelBody className="py-2">
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.scenarios.map((s) => ({
                        name: s.scenario,
                        error: s.localization_error_m ?? 0,
                        p1: s.p1_generated,
                      }))}
                      margin={{ top: 4, right: 8, left: -18, bottom: 4 }}
                    >
                      <CartesianGrid stroke="oklch(0.28 0.02 240)" vertical={false} />
                      <XAxis dataKey="name" tick={AXIS} interval={0} angle={-24} textAnchor="end" height={54} />
                      <YAxis tick={AXIS} unit="m" />
                      <Tooltip content={<TooltipBox />} cursor={{ fill: "oklch(0.28 0.02 240 / 0.4)" }} />
                      <Bar dataKey="error" name="Error (m)" radius={[2, 2, 0, 0]}>
                        {data.scenarios.map((s) => (
                          <Cell
                            key={s.scenario}
                            fill={s.p1_generated ? "oklch(0.68 0.19 25)" : "oklch(0.72 0.15 78)"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="num mt-1 text-[10px] tracking-wider text-muted-foreground">
                  RED = P1 GENERATED · AMBER = NO P1
                </p>
              </PanelBody>
            </Panel>

            <Panel>
              <PanelHeader title="Confidence under degradation" />
              <PanelBody className="py-2">
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={data.robustness.map((r) => ({
                        name: r.condition,
                        confidence: r.confidence === null ? null : Math.round(r.confidence * 100),
                      }))}
                      margin={{ top: 4, right: 8, left: -18, bottom: 4 }}
                    >
                      <CartesianGrid stroke="oklch(0.28 0.02 240)" vertical={false} />
                      <XAxis dataKey="name" tick={AXIS} interval={0} angle={-24} textAnchor="end" height={54} />
                      <YAxis tick={AXIS} domain={[0, 100]} unit="%" />
                      <Tooltip content={<TooltipBox />} />
                      <Line
                        type="monotone"
                        dataKey="confidence"
                        name="Confidence (%)"
                        stroke="oklch(0.72 0.14 215)"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        connectNulls={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </PanelBody>
            </Panel>

            <Panel className="xl:col-span-3">
              <PanelHeader title="Robustness matrix" />
              <PanelBody className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-[11px]">
                    <thead>
                      <tr className="num border-b border-border text-[9px] tracking-wider text-muted-foreground">
                        <th className="px-3 py-2 font-normal">CONDITION</th>
                        <th className="px-3 py-2 font-normal">P1</th>
                        <th className="px-3 py-2 font-normal">P2</th>
                        <th className="px-3 py-2 font-normal">P3</th>
                        <th className="px-3 py-2 font-normal">ERROR</th>
                        <th className="px-3 py-2 font-normal">SEARCH AREA</th>
                        <th className="px-3 py-2 font-normal">CONFIDENCE</th>
                        <th className="px-3 py-2 font-normal">NOTE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.robustness.map((r) => (
                        <tr key={r.condition} className="border-b border-border/50">
                          <td className="num px-3 py-1.5 text-foreground">{r.condition}</td>
                          <td className="num px-3 py-1.5 text-p1">{r.p1_count}</td>
                          <td className="num px-3 py-1.5 text-p2">{r.p2_count}</td>
                          <td className="num px-3 py-1.5 text-p3">{r.p3_count}</td>
                          <td className="num px-3 py-1.5">{meters(r.localization_error_m, "±")}</td>
                          <td className="num px-3 py-1.5">{r.search_area_m2.toLocaleString()} m²</td>
                          <td className="num px-3 py-1.5">{pct(r.confidence)}</td>
                          <td className="px-3 py-1.5 text-[10px] text-muted-foreground">{r.note ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </PanelBody>
            </Panel>

            <Panel className="xl:col-span-3">
              <PanelHeader title="Scenario results" />
              <PanelBody className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-[11px]">
                    <thead>
                      <tr className="num border-b border-border text-[9px] tracking-wider text-muted-foreground">
                        <th className="px-3 py-2 font-normal">SCENARIO</th>
                        <th className="px-3 py-2 font-normal">SENSOR CONDITION</th>
                        <th className="px-3 py-2 font-normal">TRUTH</th>
                        <th className="px-3 py-2 font-normal">TOP ZONE</th>
                        <th className="px-3 py-2 font-normal">TOP-3</th>
                        <th className="px-3 py-2 font-normal">ERROR</th>
                        <th className="px-3 py-2 font-normal">P1</th>
                        <th className="px-3 py-2 font-normal">ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.scenarios.map((s) => (
                        <tr key={s.scenario} className="border-b border-border/50">
                          <td className="num px-3 py-1.5 text-foreground">{s.scenario}</td>
                          <td className="px-3 py-1.5 text-[10px] text-muted-foreground">{s.sensor_condition}</td>
                          <td className="num px-3 py-1.5">{s.ground_truth_zone}</td>
                          <td className="num px-3 py-1.5">{s.top_predicted_zone}</td>
                          <td className="num px-3 py-1.5">
                            <span className={s.top3_contains_victim ? "text-state-active" : "text-state-degraded"}>
                              {s.top3_contains_victim ? "HIT" : "MISS"}
                            </span>
                          </td>
                          <td className="num px-3 py-1.5">{meters(s.localization_error_m, "±")}</td>
                          <td className="num px-3 py-1.5">{s.p1_generated ? "YES" : "NO"}</td>
                          <td className="num px-3 py-1.5 text-[10px] text-muted-foreground">
                            {ACTION_LABEL[s.recommended_action]}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </PanelBody>
            </Panel>

            <p className="num xl:col-span-3 border border-border bg-muted/30 px-3 py-2 text-[10px] leading-relaxed text-muted-foreground">
              {ANALYTICS_DISCLAIMER}
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
