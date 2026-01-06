import type { ReactNode } from "react";

export function AgentShell({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-zinc-950 font-sans text-zinc-100">
      {children}
    </div>
  );
}
