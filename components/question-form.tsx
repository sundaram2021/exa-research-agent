"use client";

import { useState } from "react";
import { Send } from "lucide-react";

export type ClarifyingQuestion = {
  id: string;
  question: string;
  type: "choice" | "text";
  options?: string[];
};

type QuestionFormProps = {
  questions: ClarifyingQuestion[];
  onSubmit: (answers: Record<string, string>) => void;
  isLoading?: boolean;
};

export function QuestionForm({ questions, onSubmit, isLoading }: QuestionFormProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const handleChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Map question IDs to actual question text for better context
    const answersWithQuestions: Record<string, string> = {};
    questions.forEach((q) => {
      if (answers[q.id]) {
        answersWithQuestions[q.question] = answers[q.id];
      }
    });
    
    onSubmit(answersWithQuestions);
  };

  const allAnswered = questions.every((q) => answers[q.id]?.trim());

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Help us understand your needs
        </h3>
        <p className="mt-1 text-xs text-zinc-500">
          Answer these questions to get a more relevant response
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {questions.map((question, index) => (
          <div key={question.id} className="space-y-2">
            <label className="block text-sm font-medium text-zinc-200">
              <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-zinc-700 text-xs text-zinc-300">
                {index + 1}
              </span>
              {question.question}
            </label>

            {question.type === "choice" && question.options ? (
              <div className="ml-7 space-y-2">
                {question.options.map((option, optIndex) => (
                  <label
                    key={optIndex}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                      answers[question.id] === option
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600"
                    }`}
                  >
                    <input
                      type="radio"
                      name={question.id}
                      value={option}
                      checked={answers[question.id] === option}
                      onChange={() => handleChange(question.id, option)}
                      className="h-4 w-4 border-zinc-600 bg-zinc-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-zinc-900"
                    />
                    <span className="text-sm text-zinc-300">{option}</span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="ml-7">
                <textarea
                  value={answers[question.id] || ""}
                  onChange={(e) => handleChange(question.id, e.target.value)}
                  placeholder="Type your answer..."
                  rows={2}
                  className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            )}
          </div>
        ))}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={!allAnswered || isLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Processing...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Submit Answers
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
