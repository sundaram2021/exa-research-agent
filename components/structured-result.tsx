"use client";

import { useState } from "react";
import { ExternalLink, CheckCircle2, FileText, Link2, Copy, Check } from "lucide-react";

export type SearchSource = {
  title: string;
  url: string;
  snippet: string;
};

export type StructuredResultData = {
  summary: string;
  keyPoints: string[];
  details: string;
  sources: SearchSource[];
};

type StructuredResultProps = {
  result: StructuredResultData;
};

// Simple markdown rendering for details section
function RenderDetails({ text }: { text: string }) {
  if (!text) return null;

  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="my-3 ml-4 space-y-2">
          {listItems}
        </ul>
      );
      listItems = [];
    }
  };

  lines.forEach((line, i) => {
    // Headers
    if (line.startsWith("### ")) {
      flushList();
      elements.push(
        <h4 key={i} className="mt-5 mb-2 text-sm font-semibold text-zinc-200">
          {line.slice(4)}
        </h4>
      );
      return;
    }
    if (line.startsWith("## ")) {
      flushList();
      elements.push(
        <h3 key={i} className="mt-6 mb-3 text-base font-semibold text-zinc-100">
          {line.slice(3)}
        </h3>
      );
      return;
    }

    // Bullet points
    const bulletMatch = line.match(/^[-*]\s+(.+)/);
    if (bulletMatch) {
      listItems.push(
        <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
          <span>
            <InlineFormat text={bulletMatch[1]} />
          </span>
        </li>
      );
      return;
    }

    // Regular paragraph
    if (line.trim()) {
      flushList();
      elements.push(
        <p key={i} className="my-2 text-sm leading-relaxed text-zinc-300">
          <InlineFormat text={line} />
        </p>
      );
    }
  });

  flushList();
  return <>{elements}</>;
}

// Inline formatting (bold, links)
function InlineFormat({ text }: { text: string }) {
  // Handle markdown links [text](url)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = linkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <BoldFormat key={`text-${lastIndex}`} text={text.slice(lastIndex, match.index)} />
      );
    }
    parts.push(
      <a
        key={`link-${match.index}`}
        href={match[2]}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-400 hover:text-blue-300 hover:underline"
      >
        {match[1]}
      </a>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(<BoldFormat key={`text-${lastIndex}`} text={text.slice(lastIndex)} />);
  }

  return <>{parts.length > 0 ? parts : <BoldFormat text={text} />}</>;
}

function BoldFormat({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-semibold text-zinc-100">
            {part}
          </strong>
        ) : (
          part
        )
      )}
    </>
  );
}

// Convert structured result to markdown format
function convertToMarkdown(result: StructuredResultData): string {
  let markdown = "";

  // Summary
  markdown += "## Summary\n\n";
  markdown += result.summary + "\n\n";

  // Key Points
  if (result.keyPoints.length > 0) {
    markdown += "## Key Points\n\n";
    result.keyPoints.forEach((point, index) => {
      markdown += `${index + 1}. ${point}\n`;
    });
    markdown += "\n";
  }

  // Details
  if (result.details) {
    markdown += "## Details\n\n";
    markdown += result.details + "\n\n";
  }

  // Sources
  if (result.sources.length > 0) {
    markdown += "## Sources\n\n";
    result.sources.forEach((source, index) => {
      markdown += `${index + 1}. [${source.title}](${source.url})\n`;
    });
  }

  return markdown.trim();
}

export function StructuredResult({ result }: StructuredResultProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const markdown = convertToMarkdown(result);
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <div className="rounded-xl border border-zinc-700 bg-gradient-to-br from-zinc-800/80 to-zinc-900/80 p-5">
        <div className="mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4 text-blue-400" />
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Summary
          </h3>
        </div>
        <p className="text-base leading-relaxed text-zinc-200">{result.summary}</p>
      </div>

      {/* Key Points */}
      {result.keyPoints.length > 0 && (
        <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-5">
          <div className="mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
              Key Points
            </h3>
          </div>
          <ul className="space-y-3">
            {result.keyPoints.map((point, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-medium text-emerald-400">
                  {index + 1}
                </span>
                <span className="text-sm leading-relaxed text-zinc-300">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Detailed Information */}
      {result.details && (
        <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-5">
          <div className="mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-purple-400" />
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
              Details
            </h3>
          </div>
          <div className="prose-sm">
            <RenderDetails text={result.details} />
          </div>
        </div>
      )}

      {/* Sources */}
      {result.sources.length > 0 && (
        <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-5">
          <div className="mb-4 flex items-center gap-2">
            <Link2 className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
              Sources ({result.sources.length})
            </h3>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {result.sources.slice(0, 6).map((source, index) => (
              <a
                key={index}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-3 rounded-lg border border-zinc-700 bg-zinc-900/50 p-3 transition-colors hover:border-zinc-600 hover:bg-zinc-800/50"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-zinc-700 text-xs font-medium text-zinc-400 group-hover:bg-zinc-600">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-300 group-hover:text-zinc-200">
                    {source.title}
                  </p>
                  <p className="mt-1 truncate text-xs text-zinc-500">
                    {new URL(source.url).hostname}
                  </p>
                </div>
                <ExternalLink className="h-4 w-4 shrink-0 text-zinc-500 group-hover:text-zinc-400" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Copy Button */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white"
          title="Copy as Markdown"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 text-emerald-400" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              <span>Copy as README</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
