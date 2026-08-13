import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { CommandHeader } from "@/components/shell/CommandHeader";
import { SystemStatusBar } from "@/components/shell/SystemStatusBar";
import { useSimulation } from "@/lib/state/simulation";
import { systemQuery } from "@/lib/state/queries";

export function AppShell({ children }: { children: ReactNode }) {
  const { scenario, clock } = useSimulation();
  const { data: status } = useQuery(systemQuery(scenario, clock));

  return (
    <div className="flex h-screen min-h-0 flex-col bg-background">
      <CommandHeader />
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</main>
      <SystemStatusBar status={status} />
    </div>
  );
}
