"use client";

import { MessageSquarePlus } from "lucide-react";

type NewChatButtonProps = {
  onClick: () => void;
};

export function NewChatButton({ onClick }: NewChatButtonProps) {
  return (
    <button
      onClick={onClick}
      className="absolute left-6 top-6 z-20 flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-700 hover:text-white"
      title="Start new chat"
    >
      <MessageSquarePlus className="h-4 w-4" />
      <span>New Chat</span>
    </button>
  );
}
