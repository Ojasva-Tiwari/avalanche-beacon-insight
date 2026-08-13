import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/replay")({
  component: ReplayPage,
});

function ReplayPage() {
  return null;
}
