import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/incident")({
  component: IncidentPage,
});

function IncidentPage() {
  return null;
}
