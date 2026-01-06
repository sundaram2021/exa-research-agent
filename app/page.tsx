"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import { AgentShell } from "@/components/agent-shell";
import { ChatComposer } from "@/components/chat-composer";
import { ChatThread, type UiMessage, type SearchSource } from "@/components/chat-thread";
import { ErrorBanner } from "@/components/error-banner";
import type { ClarifyingQuestion } from "@/components/question-form";
import type { StructuredResultData } from "@/components/structured-result";

type AgentState = {
  searchContext: SearchSource[];
  round: number;
  allAnswers: Record<string, string>;
};

export default function Home() {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [sources, setSources] = useState<SearchSource[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pendingQuestions, setPendingQuestions] = useState<ClarifyingQuestion[]>([]);
  const [waitingForAnswers, setWaitingForAnswers] = useState(false);
  const [agentState, setAgentState] = useState<AgentState>({
    searchContext: [],
    round: 1,
    allAnswers: {},
  });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const callAgent = async (
    requestMessages: UiMessage[],
    answers?: Record<string, string>,
    searchContext?: SearchSource[],
    round?: number
  ) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);
    setStatus(null);
    setSources([]);
    setPendingQuestions([]);
    setWaitingForAnswers(false);

    let currentSources: SearchSource[] = searchContext || [];

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: requestMessages
            .filter((m) => m.role === "user" || (m.role === "assistant" && m.content))
            .map((m) => ({ role: m.role, content: m.content })),
          answers,
          searchContext,
          round: round || 1,
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const message = await response.text();
        throw new Error(message || "Request failed");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const event = JSON.parse(line) as {
              type: string;
              data?: string;
              message?: string;
              sources?: SearchSource[];
              questions?: ClarifyingQuestion[];
              result?: StructuredResultData;
            };

            if (event.type === "sources" && event.sources) {
              currentSources = event.sources;
              setSources(event.sources);
              setAgentState((prev) => ({ ...prev, searchContext: event.sources! }));
            }

            if (event.type === "status" && event.data) {
              setStatus(event.data);
            }

            if (event.type === "questions" && event.questions) {
              setPendingQuestions(event.questions);
              setSources([]);
              setStatus(null);
            }

            if (event.type === "waiting_for_answers") {
              setWaitingForAnswers(true);
              // Update the last message to show waiting state
              setMessages((prev) => {
                const updated = [...prev];
                const lastIdx = updated.length - 1;
                if (lastIdx >= 0 && updated[lastIdx].role === "assistant") {
                  updated[lastIdx] = { ...updated[lastIdx], isWaiting: true };
                }
                return updated;
              });
            }

            if (event.type === "final_result" && event.result) {
              setSources([]);
              setStatus(null);
              // Update the last assistant message with the final result
              setMessages((prev) => {
                const updated = [...prev];
                const lastIdx = updated.length - 1;
                if (lastIdx >= 0 && updated[lastIdx].role === "assistant") {
                  updated[lastIdx] = {
                    ...updated[lastIdx],
                    finalResult: event.result,
                    isWaiting: false,
                    sources: currentSources,
                  };
                }
                return updated;
              });
            }

            if (event.type === "error") {
              setError(event.message ?? "Agent error");
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      const message = err instanceof Error ? err.message : "Unexpected error";
      setError(message);
    } finally {
      setIsLoading(false);
      setStatus(null);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const trimmed = query.trim();
    if (!trimmed) return;

    // Reset agent state for new query
    setAgentState({
      searchContext: [],
      round: 1,
      allAnswers: {},
    });
    setPendingQuestions([]);
    setWaitingForAnswers(false);

    const requestMessages: UiMessage[] = [
      ...messages,
      { role: "user", content: trimmed },
    ];

    setMessages([...requestMessages, { role: "assistant", content: "" }]);
    setQuery("");

    await callAgent(requestMessages, undefined, undefined, 1);
  };

  const handleAnswerQuestions = async (answers: Record<string, string>) => {
    // Merge with existing answers
    const allAnswers = { ...agentState.allAnswers, ...answers };
    const nextRound = agentState.round + 1;

    setAgentState((prev) => ({
      ...prev,
      allAnswers,
      round: nextRound,
    }));

    // Update the current waiting message to show it's processing
    setMessages((prev) => {
      const updated = [...prev];
      const lastIdx = updated.length - 1;
      if (lastIdx >= 0 && updated[lastIdx].role === "assistant") {
        updated[lastIdx] = {
          ...updated[lastIdx],
          isWaiting: false,
          questions: pendingQuestions,
        };
      }
      // Add a new assistant message for the next response
      return [...updated, { role: "assistant", content: "" }];
    });

    // Clear pending questions
    setPendingQuestions([]);
    setWaitingForAnswers(false);

    // Get original messages (without the assistant placeholder)
    const originalMessages = messages.filter((m) => m.role === "user");

    await callAgent(
      originalMessages,
      allAnswers,
      agentState.searchContext,
      nextRound
    );
  };

  const handleNewChat = () => {
    // Check if there are any messages in the current chat
    if (messages.length > 0) {
      const confirmed = window.confirm(
        "Are you sure you want to start a new chat? All current messages and chat information will be lost."
      );
      if (!confirmed) {
        return;
      }
    }

    // Reset all state for a new chat
    abortRef.current?.abort();
    setMessages([]);
    setQuery("");
    setIsLoading(false);
    setStatus(null);
    setSources([]);
    setError(null);
    setPendingQuestions([]);
    setWaitingForAnswers(false);
    setAgentState({
      searchContext: [],
      round: 1,
      allAnswers: {},
    });
  };

  return (
    <AgentShell>
      {/* New Chat Button - Top Left */}
      <button
        onClick={handleNewChat}
        className="absolute left-6 top-6 z-20 flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-700 hover:text-white"
        title="Start new chat"
      >
        <MessageSquarePlus className="h-4 w-4" />
        <span>New Chat</span>
      </button>

      {/* Main chat area */}
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
            onStop={() => abortRef.current?.abort()}
            disabled={waitingForAnswers}
          />
        </section>

        {error ? (
          <div className="mx-auto mt-3 w-full max-w-4xl">
            <ErrorBanner message={error} />
          </div>
        ) : null}
      </main>
    </AgentShell>
  );
}
