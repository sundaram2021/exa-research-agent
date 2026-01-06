import type { FormEvent } from "react";
import { Send, Square } from "lucide-react";

export function ChatComposer({
  value,
  isLoading,
  onChange,
  onSubmit,
  onStop,
  disabled,
}: {
  value: string;
  isLoading: boolean;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onStop: () => void;
  disabled?: boolean;
}) {
  const isDisabled = isLoading || disabled;

  return (
    <div className="border-t border-zinc-700 p-3">
      <form className="flex items-end gap-2" onSubmit={onSubmit}>
        <textarea
          className="h-11 w-full resize-none rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-base leading-6 text-zinc-200 placeholder:text-zinc-500 shadow-inner outline-none ring-2 ring-transparent transition focus:border-zinc-600 focus:ring-zinc-700 disabled:opacity-50"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={disabled ? "Please answer the questions above..." : "Message the agent..."}
          disabled={isDisabled}
        />

        {isLoading ? (
          <button
            type="button"
            onClick={onStop}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-medium text-white transition hover:bg-red-500"
          >
            <Square className="h-4 w-4" />
            Stop
          </button>
        ) : (
          <button
            type="submit"
            disabled={isDisabled || !value.trim()}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gray-600 px-4 text-sm font-medium text-white transition hover:bg-gray-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            Send
          </button>
        )}
      </form>
    </div>
  );
}
