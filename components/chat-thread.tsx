"use client";

import { useEffect, useRef } from "react";
import { Bot, ExternalLink, Loader2, Search, User, HelpCircle } from "lucide-react";
import { AgentHeader } from "./agent-header";
import { QuestionForm, type ClarifyingQuestion } from "./question-form";
import { StructuredResult, type StructuredResultData } from "./structured-result";

export type SearchSource = {
  title: string;
  url: string;
  snippet: string;
};

export type UiMessage = {
  role: "user" | "assistant";
  content: string;
  sources?: SearchSource[];
  questions?: ClarifyingQuestion[];
  finalResult?: StructuredResultData;
  isWaiting?: boolean;
};

export function ChatThread({
  messages,
  status,
  sources,
  pendingQuestions,
  waitingForAnswers,
  onAnswerQuestions,
  isLoading,
}: {
  messages: UiMessage[];
  status?: string | null;
  sources?: SearchSource[];
  pendingQuestions?: ClarifyingQuestion[];
  waitingForAnswers?: boolean;
  onAnswerQuestions?: (answers: Record<string, string>) => void;
  isLoading?: boolean;
}) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages, status, pendingQuestions]);

  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
      {messages.length === 0  && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 rounded-full p-4">
            <Bot className="h-8 w-8 text-white" />
          </div>
          <AgentHeader />
        </div>
      )}

      {messages.map((message, index) => (
        <div key={index}>
          {/* User message */}
          {message.role === "user" && (
            <div className="flex justify-end">
              <div className="flex max-w-[90%] items-start gap-3 flex-row-reverse">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-500">
                  <User className="h-4 w-4" />
                </div>
                <div className="rounded-2xl px-4 py-3 text-sm text-zinc-800 dark:text-zinc-200">
                  {message.content}
                </div>
              </div>
            </div>
          )}

          {/* Assistant message with final result */}
          {message.role === "assistant" && message.finalResult && (
            <div className="flex justify-start">
              <div className="flex max-w-[95%] items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white bg-gray-500">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <StructuredResult result={message.finalResult} />
                </div>
              </div>
            </div>
          )}

          {/* Assistant message with questions (historical) */}
          {message.role === "assistant" && message.questions && message.questions.length > 0 && !message.finalResult && (
            <div className="flex justify-start">
              <div className="flex max-w-[95%] items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white">
                  <HelpCircle className="h-4 w-4" />
                </div>
                <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3">
                  <p className="text-sm text-zinc-400">
                    Questions were asked and answered
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Assistant waiting state */}
          {message.role === "assistant" && message.isWaiting && (
            <div className="flex justify-start">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="inline-flex items-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-zinc-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Waiting for your answers...
                </div>
              </div>
            </div>
          )}

          {/* Regular assistant message */}
          {message.role === "assistant" && !message.finalResult && !message.questions?.length && !message.isWaiting && message.content && (
            <div className="flex justify-start">
              <div className="flex max-w-[90%] items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm">
                  <p className="text-zinc-300">{message.content}</p>
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-3 border-t border-zinc-700 pt-3">
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                        Sources
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {message.sources.slice(0, 5).map((source, i) => (
                          <a
                            key={i}
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-400 transition hover:border-zinc-600"
                          >
                            <ExternalLink className="h-3 w-3" />
                            <span className="max-w-[150px] truncate">{source.title}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Loading state for assistant */}
          {message.role === "assistant" && !message.content && !message.finalResult && !message.questions?.length && !message.isWaiting && (
            <div className="flex justify-start">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="inline-flex items-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-zinc-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Thinking...
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Show current sources being searched */}
      {sources && sources.length > 0 && (
        <div className="flex justify-start">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white shadow-sm">
              <Search className="h-4 w-4" />
            </div>
            <div className="rounded-2xl border border-amber-800 bg-amber-900/30 px-4 py-3">
              <p className="mb-2 text-sm font-medium text-amber-200">
                Found {sources.length} sources
              </p>
              <div className="flex flex-wrap gap-2">
                {sources.slice(0, 4).map((s, i) => (
                  <span
                    key={i}
                    className="inline-block max-w-[200px] truncate rounded bg-amber-800/50 px-2 py-0.5 text-xs text-amber-300"
                  >
                    {s.title}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status indicator */}
      {status && (
        <div className="flex justify-start">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white shadow-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
            <div className="inline-flex items-center gap-2 rounded-2xl border border-blue-800 bg-blue-900/30 px-4 py-3 text-sm text-blue-300 shadow-sm">
              {status}
            </div>
          </div>
        </div>
      )}

      {/* Pending questions form */}
      {pendingQuestions && pendingQuestions.length > 0 && waitingForAnswers && onAnswerQuestions && (
        <div className="flex justify-start">
          <div className="flex max-w-[95%] items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-500 text-white shadow-sm">
              <HelpCircle className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <QuestionForm
                questions={pendingQuestions}
                onSubmit={onAnswerQuestions}
                isLoading={isLoading}
              />
            </div>
          </div>
        </div>
      )}

      <div ref={endRef} />
    </div>
  );
}
