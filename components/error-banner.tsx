import { AlertTriangle } from "lucide-react";

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/60 dark:text-red-200">
      <AlertTriangle className="mt-0.5 h-4 w-4" aria-hidden="true" />
      <div className="min-w-0 break-words">{message}</div>
    </div>
  );
}
