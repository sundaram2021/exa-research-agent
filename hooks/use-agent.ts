"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { UiMessage, SearchSource } from "@/components/chat-thread";
import type { ClarifyingQuestion } from "@/components/question-form";
import type { StructuredResultData } from "@/components/structured-result";

// Types
type AgentState = {
  searchContext: SearchSource[];
  round: number;
  allAnswers: Record<string, string>;
};

type AgentEvent = {
  type: string;
  data?: string;
  message?: string;
  sources?: SearchSource[];
  questions?: ClarifyingQuestion[];
  result?: StructuredResultData;
};

type UseAgentReturn = {
  // State
  messages: UiMessage[];
  query: string;
  isLoading: boolean;
  status: string | null;
  sources: SearchSource[];
  error: string | null;
  pendingQuestions: ClarifyingQuestion[];
  waitingForAnswers: boolean;
  // Actions
  setQuery: (query: string) => void;
  handleSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  handleAnswerQuestions: (answers: Record<string, string>) => Promise<void>;
  handleNewChat: () => void;
  handleStop: () => void;
};

// Initial state
const initialAgentState: AgentState = {
  searchContext: [],
  round: 1,
  allAnswers: {},
};

// Helper: Parse streaming response lines
function parseEventLine(line: string): AgentEvent | null {
  if (!line.trim()) return null;
  try {
    return JSON.parse(line) as AgentEvent;
  } catch {
    return null;
  }
}

// Helper: Process stream buffer and extract complete lines
function extractLines(buffer: string): { lines: string[]; remaining: string } {
  const parts = buffer.split("\n");
  const remaining = parts.pop() ?? "";
  return { lines: parts, remaining };
}

export function useAgent(): UseAgentReturn {
  // Core state
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [sources, setSources] = useState<SearchSource[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pendingQuestions, setPendingQuestions] = useState<
    ClarifyingQuestion[]
  >([]);
  const [waitingForAnswers, setWaitingForAnswers] = useState(false);
  const [agentState, setAgentState] = useState<AgentState>(initialAgentState);

  // Refs
  const abortRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  // Handle individual stream events
  const handleStreamEvent = useCallback(
    (event: AgentEvent, currentSources: SearchSource[]) => {
      let updatedSources = currentSources;

      if (event.type === "sources" && event.sources) {
        updatedSources = event.sources;
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
        setMessages((prev) => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (lastIdx >= 0 && updated[lastIdx].role === "assistant") {
            updated[lastIdx] = {
              ...updated[lastIdx],
              finalResult: event.result,
              isWaiting: false,
              sources: updatedSources,
            };
          }
          return updated;
        });
      }

      if (event.type === "error") {
        setError(event.message ?? "Agent error");
      }

      return updatedSources;
    },
    []
  );

  // Core agent call function
  const callAgent = useCallback(
    async (
      requestMessages: UiMessage[],
      answers?: Record<string, string>,
      searchContext?: SearchSource[],
      round?: number
    ) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      // Reset transient state
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
              .filter(
                (m) =>
                  m.role === "user" || (m.role === "assistant" && m.content)
              )
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
          const { lines, remaining } = extractLines(buffer);
          buffer = remaining;

          for (const line of lines) {
            const event = parseEventLine(line);
            if (event) {
              currentSources = handleStreamEvent(event, currentSources);
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
    },
    [handleStreamEvent]
  );

  // Handle form submission for new queries
  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setError(null);

      const trimmed = query.trim();
      if (!trimmed) return;

      // Reset agent state for new query
      setAgentState(initialAgentState);
      setPendingQuestions([]);
      setWaitingForAnswers(false);

      const requestMessages: UiMessage[] = [
        ...messages,
        { role: "user", content: trimmed },
      ];

      setMessages([...requestMessages, { role: "assistant", content: "" }]);
      setQuery("");

      await callAgent(requestMessages, undefined, undefined, 1);
    },
    [query, messages, callAgent]
  );

  // Handle clarifying question answers
  const handleAnswerQuestions = useCallback(
    async (answers: Record<string, string>) => {
      const allAnswers = { ...agentState.allAnswers, ...answers };
      const nextRound = agentState.round + 1;

      setAgentState((prev) => ({
        ...prev,
        allAnswers,
        round: nextRound,
      }));

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
        return [...updated, { role: "assistant", content: "" }];
      });

      setPendingQuestions([]);
      setWaitingForAnswers(false);

      const originalMessages = messages.filter((m) => m.role === "user");

      await callAgent(
        originalMessages,
        allAnswers,
        agentState.searchContext,
        nextRound
      );
    },
    [agentState, messages, pendingQuestions, callAgent]
  );

  // Handle starting a new chat
  const handleNewChat = useCallback(() => {
    if (messages.length > 0) {
      const confirmed = window.confirm(
        "Are you sure you want to start a new chat? All current messages and chat information will be lost."
      );
      if (!confirmed) return;
    }

    abortRef.current?.abort();
    setMessages([]);
    setQuery("");
    setIsLoading(false);
    setStatus(null);
    setSources([]);
    setError(null);
    setPendingQuestions([]);
    setWaitingForAnswers(false);
    setAgentState(initialAgentState);
  }, [messages.length]);

  // Handle stopping the current request
  const handleStop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return {
    // State
    messages,
    query,
    isLoading,
    status,
    sources,
    error,
    pendingQuestions,
    waitingForAnswers,
    // Actions
    setQuery,
    handleSubmit,
    handleAnswerQuestions,
    handleNewChat,
    handleStop,
  };
}
