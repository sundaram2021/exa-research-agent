import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { type Env } from "./env";
import { search, type SearchResult } from "./search";

export type Message = {
  role: "user" | "assistant";
  content: string;
};

export type ClarifyingQuestion = {
  id: string;
  question: string;
  type: "choice" | "text";
  options?: string[];
};

export type StructuredResult = {
  summary: string;
  keyPoints: string[];
  details: string;
  sources: SearchResult[];
};

type GatewayModel = Parameters<typeof generateText>[0]["model"];

export type AgentEvent =
  | { type: "status"; data: string }
  | { type: "token"; data: string }
  | { type: "sources"; sources: SearchResult[] }
  | { type: "questions"; questions: ClarifyingQuestion[] }
  | { type: "waiting_for_answers" }
  | { type: "final_result"; result: StructuredResult }
  | { type: "error"; message: string }
  | { type: "done" };

export type AgentRequest = {
  messages: Message[];
  answers?: Record<string, string>;
  searchContext?: SearchResult[];
  round?: number;
};

const ANALYSIS_PROMPT = `You are a research analyst. Given search results and a user query, determine if you need clarifying questions or can provide a final answer.

RULES:
- If the topic is broad or ambiguous, generate 2-3 clarifying questions
- If you have enough context to give a specific answer, indicate ready for final answer
- Never use emojis in your responses
- Be concise and professional

Respond in this exact JSON format:
{
  "needsClarification": true/false,
  "questions": [
    {
      "id": "q1",
      "question": "Your question here",
      "type": "choice",
      "options": ["Option A", "Option B", "Option C"]
    }
  ],
  "reasoning": "Brief explanation of why you need these questions or why you're ready to answer"
}

For text input questions, use type "text" and omit options.`;

const FINAL_ANSWER_PROMPT = `You are a research assistant providing a final, well-structured answer.

RULES:
- Provide a comprehensive but focused answer
- Never use emojis
- Structure your response clearly
- Cite sources where relevant
- Be professional and direct

Respond in this exact JSON format:
{
  "summary": "A 2-3 sentence summary of the key answer",
  "keyPoints": ["Point 1", "Point 2", "Point 3"],
  "details": "Detailed explanation with markdown formatting. Use ## for sections, bullet points, and **bold** for emphasis. Include inline citations like [Source Name](url) where appropriate."
}`;

function generateSearchQueries(userQuery: string, context?: string): string[] {
  const queries = [userQuery];

  if (context) {
    queries.push(`${userQuery} ${context}`);
  }

  if (userQuery.split(" ").length <= 4) {
    queries.push(`${userQuery} comprehensive guide 2025`);
  }

  return queries.slice(0, 2);
}

async function callGenerateWithRetry(opts: any, maxAttempts = 5): Promise<any> {
  let attempt = 0;
  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      return await generateText(opts as any);
    } catch (err: any) {
      const isRetryable = err?.isRetryable ?? true;
      console.error(`generateText attempt ${attempt} failed:`, err?.message ?? err);

      if (attempt >= maxAttempts || !isRetryable) {
        throw err;
      }

      const backoff = Math.min(2000 * 2 ** (attempt - 1), 10000);
      const jitter = Math.floor(Math.random() * 300);
      await new Promise((res) => setTimeout(res, backoff + jitter));
    }
  }
}

async function analyzeAndGenerateQuestions(
  model: GatewayModel,
  query: string,
  searchResults: SearchResult[],
  previousAnswers?: Record<string, string>
): Promise<{ needsClarification: boolean; questions: ClarifyingQuestion[] }> {
  const searchContext = searchResults
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}`)
    .join("\n\n");

  let userContent = `User Query: "${query}"

Search Results:
${searchContext}`;

  if (previousAnswers && Object.keys(previousAnswers).length > 0) {
    userContent += `\n\nPrevious clarifying answers from user:
${Object.entries(previousAnswers)
  .map(([q, a]) => `Q: ${q}\nA: ${a}`)
  .join("\n\n")}`;
  }

    try {
    const opts: any = {
      model,
      system: ANALYSIS_PROMPT,
      messages: [{ role: "user", content: userContent }],
      maxTokens: 1000,
    };

    const response = await callGenerateWithRetry(opts);

    const content = response.text || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        needsClarification: parsed.needsClarification ?? false,
        questions: parsed.questions || [],
      };
    }
  } catch (err) {
    console.error("Analysis error:", err);
  }

  return { needsClarification: false, questions: [] };
}

async function generateFinalAnswer(
  model: GatewayModel,
  query: string,
  searchResults: SearchResult[],
  answers: Record<string, string>
): Promise<StructuredResult> {
  const searchContext = searchResults
    .map((r, i) => `[${i + 1}] ${r.title} (${r.url})\n${r.snippet}`)
    .join("\n\n");

  const answersContext = Object.entries(answers)
    .map(([q, a]) => `Q: ${q}\nA: ${a}`)
    .join("\n\n");

  const userContent = `Original Query: "${query}"

User's Clarifying Answers:
${answersContext}

Search Results:
${searchContext}

Based on the user's specific requirements and the search results, provide a comprehensive final answer.`;

    try {
    const opts: any = {
      model,
      system: FINAL_ANSWER_PROMPT,
      messages: [{ role: "user", content: userContent }],
      maxTokens: 2000,
    };

    const response = await callGenerateWithRetry(opts);

    const content = response.text || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        summary: parsed.summary || "Unable to generate summary",
        keyPoints: parsed.keyPoints || [],
        details: parsed.details || "",
        sources: searchResults,
      };
    }
  } catch (err) {
    console.error("Final answer error:", err);
  }

  return {
    summary: "An error occurred while generating the answer.",
    keyPoints: [],
    details: "",
    sources: searchResults,
  };
}

export async function* runAgent(
  env: Env,
  request: AgentRequest
): AsyncGenerator<AgentEvent> {
  const openai = createOpenAI({
    apiKey: env.VERCEL_AI_GATEWAY_API_KEY,
    baseURL: env.VERCEL_AI_GATEWAY_BASE_URL,
  });
  const model = openai(env.VERCEL_AI_GATEWAY_MODEL);

  const {
    messages,
    answers,
    searchContext: previousSearchResults,
    round = 1,
  } = request;
  const maxRounds = 3;

  const latestQuery =
    messages.filter((m) => m.role === "user").pop()?.content || "";
  const originalQuery =
    messages.find((m) => m.role === "user")?.content || latestQuery;

  // Step 1: Search via Exa API
  yield { type: "status", data: "Searching the web..." };

  let searchResults: SearchResult[] = previousSearchResults || [];

  if (!previousSearchResults || previousSearchResults.length === 0) {
    try {
      const answersContext = answers ? Object.values(answers).join(" ") : "";
      const queries = generateSearchQueries(latestQuery, answersContext);
      searchResults = await search(env.EXA_API_KEY, queries);

      if (searchResults.length > 0) {
        yield { type: "sources", sources: searchResults };
      }
    } catch (err) {
      yield {
        type: "error",
        message: err instanceof Error ? err.message : "Search failed",
      };
      return;
    }
  } else {
    yield { type: "sources", sources: searchResults };
  }

  // Step 2: Analyze if we need clarification or can answer
  yield { type: "status", data: "Analyzing results..." };

  // If we have answers and are past round 1, or at max rounds, generate final answer
  const hasAnswers = answers && Object.keys(answers).length > 0;

  if (round >= maxRounds || (hasAnswers && round > 1)) {
    yield { type: "status", data: "Generating comprehensive answer..." };

    const result = await generateFinalAnswer(
      model,
      originalQuery,
      searchResults,
      answers || {}
    );

    yield { type: "final_result", result };
    yield { type: "done" };
    return;
  }

  // Analyze and potentially ask questions
  const analysis = await analyzeAndGenerateQuestions(
    model,
    originalQuery,
    searchResults,
    answers
  );

  if (analysis.needsClarification && analysis.questions.length > 0) {
    yield { type: "questions", questions: analysis.questions };
    yield { type: "waiting_for_answers" };
    yield { type: "done" };
    return;
  }

  // No clarification needed, generate final answer
  yield { type: "status", data: "Generating comprehensive answer..." };

  const result = await generateFinalAnswer(
    model,
    originalQuery,
    searchResults,
    answers || {}
  );

  yield { type: "final_result", result };
  yield { type: "done" };
}
