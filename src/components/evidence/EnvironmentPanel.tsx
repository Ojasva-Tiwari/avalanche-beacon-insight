import { Snowflake } from "lucide-react";

import { Panel, PanelBody, PanelHeader, Row, Skeleton, Tag } from "@/components/common/Panel";
import type { EnvironmentalConditions } from "@/lib/types";

export function EnvironmentPanel({ env }: { env?: EnvironmentalConditions | undefined }) {
  return (
    <Panel>
      <PanelHeader
        title="Environmental conditions"
        icon={<Snowflake className="size-3.5 text-primary" aria-hidden />}
        right={<Tag className="border-p2/40 bg-p2/10 text-p2">SIMULATED</Tag>}
      />
      <PanelBody className="py-2">
        {!env ? (
          <Skeleton lines={4} />
        ) : (
          <>
            <Row label="Snow depth" value={`${env.snow_depth_m.toFixed(1)} m`} />
            <Row
              label="Visibility"
              value={env.visibility}
              tone={env.visibility === "POOR" ? "text-state-degraded" : undefined}
            />
            <Row label="Wind" value={env.wind} tone={env.wind === "HIGH" ? "text-state-degraded" : undefined} />
            <Row label="Temperature" value={`${env.temperature_c}°C`} />
            <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
              Prototype values — not live field measurements.
            </p>
          </>
        )}
      </PanelBody>
    </Panel>
  );
}
