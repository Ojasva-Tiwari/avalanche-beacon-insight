import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "Avalanche Rescue Command System — Victim Localization Support" },
      {
        name: "description",
        content:
          "SIH 2026 prototype command interface for avalanche victim localization: prioritized search zones, sensor evidence fusion and rescue decision support.",
      },
      { property: "og:title", content: "Avalanche Rescue Command System" },
      {
        property: "og:description",
        content:
          "Prototype avalanche rescue decision support: where to search, why, and what to do next.",
      },
    ],
  }),
  component: () => null,
});
