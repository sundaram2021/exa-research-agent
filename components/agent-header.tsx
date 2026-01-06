
export function AgentHeader() {
  return (
    <header className="flex flex-col gap-2">
      <p className="inline-flex items-center justify-center text-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400">
        <span className="text-center">Exa Research Agent</span>
      </p>
      <h1 className="text-3xl font-semibold leading-tight text-zinc-100">
        Search. Clarify. Answer.
      </h1>
      <p className="text-base text-zinc-400">
        I search the web first, then ask targeted questions to give you exactly what you need.
      </p>
    </header>
  );
}
