import { AlertTriangle, MapPin } from "lucide-react";

import { Panel, PanelBody, PanelHeader, Row, Skeleton, Tag } from "@/components/common/Panel";
import { bearingLabel } from "@/lib/format";
import type { Incident } from "@/lib/types";

export function IncidentPanel({ incident }: { incident?: Incident }) {
  return (
    <Panel>
      <PanelHeader
        title="Incident"
        icon={<AlertTriangle className="size-3.5 text-p1" aria-hidden />}
        right={<Tag className="border-p2/40 bg-p2/10 text-p2">PROTOTYPE DATA</Tag>}
      />
      <PanelBody className="py-2">
        {!incident ? (
          <Skeleton lines={5} />
        ) : (
          <div className="divide-y divide-border/60">
            <div className="pb-1">
              <Row label="Incident ID" value={incident.incident_id} />
              <Row label="Location" value={incident.location_name} mono={false} />
              <Row
                label="Avalanche"
                value={
                  <span className="text-p1">
                    <span aria-hidden>● </span>
                    {incident.avalanche_status}
                  </span>
                }
              />
              <Row label="Declared" value={incident.declared_at} />
            </div>
            <div className="py-1">
              <p className="label-caps flex items-center gap-1">
                <MapPin className="size-3" aria-hidden /> Last-known position
              </p>
              <p className="num mt-1 text-xs text-foreground">
                {incident.last_known_position.latitude.toFixed(4)}° N
              </p>
              <p className="num text-xs text-foreground">
                {incident.last_known_position.longitude.toFixed(4)}° E
              </p>
            </div>
            <div className="py-1">
              <Row
                label="Avalanche flow"
                value={`${incident.avalanche_flow_bearing_deg}° ${bearingLabel(
                  incident.avalanche_flow_bearing_deg,
                )}`}
              />
              <Row label="Elevation" value={`${incident.elevation_m} m`} />
              <Row label="Suspected victims" value={`${incident.suspected_victims} (simulated)`} />
            </div>
          </div>
        )}
      </PanelBody>
    </Panel>
  );
}
