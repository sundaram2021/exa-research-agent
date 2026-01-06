"use client";

import { AgentShell } from "@/components/agent-shell";
import { ChatComposer } from "@/components/chat-composer";
import { ChatThread } from "@/components/chat-thread";
import { ErrorBanner } from "@/components/error-banner";
import { NewChatButton } from "@/components/new-chat-button";
import { useAgent } from "@/hooks/use-agent";

export default function Home() {
  const {
    messages,
    query,
    isLoading,
    status,
    sources,
    error,
    pendingQuestions,
    waitingForAnswers,
    setQuery,
    handleSubmit,
    handleAnswerQuestions,
    handleNewChat,
    handleStop,
  } = useAgent();

  return (
    <AgentShell>
      <NewChatButton onClick={handleNewChat} />

      <main className="relative z-10 flex h-full w-full flex-1 flex-col p-4">
        <section className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col rounded-2xl border border-zinc-800 bg-zinc-900/90 shadow-lg backdrop-blur-sm">
          <ChatThread
            messages={messages}
            status={status}
            sources={sources}
            pendingQuestions={pendingQuestions}
            waitingForAnswers={waitingForAnswers}
            onAnswerQuestions={handleAnswerQuestions}
            isLoading={isLoading}
          />

          <ChatComposer
            value={query}
            isLoading={isLoading || waitingForAnswers}
            onChange={setQuery}
            onSubmit={handleSubmit}
            onStop={handleStop}
            disabled={waitingForAnswers}
          />
        </section>

        {error && (
          <div className="mx-auto mt-3 w-full max-w-4xl">
            <ErrorBanner message={error} />
          </div>
        )}
      </main>
    </AgentShell>
  );
}
