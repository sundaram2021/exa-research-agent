import { NextResponse } from "next/server";
import { z } from "zod";
import { loadEnv } from "@/lib/env";
import { runAgent, type AgentRequest } from "@/lib/agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

const searchResultSchema = z.object({
  title: z.string(),
  url: z.string(),
  snippet: z.string(),
  publishedDate: z.string().nullable().optional(),
});

const requestSchema = z.object({
  messages: z.array(messageSchema).min(1, "At least one message is required"),
  answers: z.record(z.string(), z.string()).optional(),
  searchContext: z.array(searchResultSchema).optional(),
  round: z.number().optional(),
});

const encoder = new TextEncoder();
const formatEvent = (data: unknown) =>
  encoder.encode(`${JSON.stringify(data)}\n`);

export async function POST(req: Request) {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const env = loadEnv();

    const agentRequest: AgentRequest = {
      messages: parsed.data.messages,
      answers: parsed.data.answers,
      searchContext: parsed.data.searchContext,
      round: parsed.data.round || 1,
    };

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of runAgent(env, agentRequest)) {
            controller.enqueue(formatEvent(event));
          }
          controller.close();
        } catch (error) {
          controller.enqueue(
            formatEvent({
              type: "error",
              message: error instanceof Error ? error.message : "Error",
            })
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error" },
      { status: 500 }
    );
  }
}
