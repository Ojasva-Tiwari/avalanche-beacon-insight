import { queryOptions } from "@tanstack/react-query";

import {
  analyticsApi,
  evidenceApi,
  incidentApi,
  replayApi,
  searchApi,
  sensorApi,
  systemApi,
} from "@/lib/api";
import type { ScenarioId } from "@/lib/types";

export const incidentQuery = () =>
  queryOptions({ queryKey: ["incident"], queryFn: () => incidentApi.getIncident() });

export const environmentQuery = () =>
  queryOptions({ queryKey: ["environment"], queryFn: () => incidentApi.getEnvironment() });

export const zonesQuery = (scenario: ScenarioId) =>
  queryOptions({
    queryKey: ["zones", scenario],
    queryFn: () => searchApi.getSearchZones(scenario),
  });

export const zoneDetailsQuery = (scenario: ScenarioId, zoneId: string) =>
  queryOptions({
    queryKey: ["zone", scenario, zoneId],
    queryFn: () => searchApi.getZoneDetails(scenario, zoneId),
  });

export const sensorsQuery = (scenario: ScenarioId) =>
  queryOptions({
    queryKey: ["sensors", scenario],
    queryFn: () => sensorApi.getSensorStatus(scenario),
  });

export const systemQuery = (scenario: ScenarioId, lastUpdate: string) =>
  queryOptions({
    queryKey: ["system", scenario, lastUpdate],
    queryFn: () => systemApi.getSystemStatus(scenario, lastUpdate),
  });

export const timelineQuery = () =>
  queryOptions({ queryKey: ["timeline"], queryFn: () => evidenceApi.getEvidenceTimeline() });

export const replayQuery = () =>
  queryOptions({ queryKey: ["replay"], queryFn: () => replayApi.getReplayEvents() });

export const analyticsQuery = () =>
  queryOptions({ queryKey: ["analytics"], queryFn: () => analyticsApi.getAnalyticsMetrics() });
