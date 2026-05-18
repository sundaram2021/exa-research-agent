import { z } from "zod";

const envSchema = z.object({
  VERCEL_AI_GATEWAY_API_KEY: z
    .string()
    .min(1, "VERCEL_AI_GATEWAY_API_KEY required"),
  VERCEL_AI_GATEWAY_BASE_URL: z
    .string()
    .url()
    .default("https://ai-gateway.vercel.sh/v1"),
  VERCEL_AI_GATEWAY_MODEL: z
    .string()
    .default("deepseek/deepseek-v4-flash"),
  EXA_API_KEY: z.string().min(1, "EXA_API_KEY required"),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  const result = envSchema.safeParse({
    VERCEL_AI_GATEWAY_API_KEY: process.env.VERCEL_AI_GATEWAY_API_KEY,
    VERCEL_AI_GATEWAY_BASE_URL: process.env.VERCEL_AI_GATEWAY_BASE_URL,
    VERCEL_AI_GATEWAY_MODEL: process.env.VERCEL_AI_GATEWAY_MODEL,
    EXA_API_KEY: process.env.EXA_API_KEY,
  });

  if (!result.success) {
    throw new Error(
      `Missing env: ${result.error.issues.map((i) => i.message).join(", ")}`
    );
  }

  return result.data;
}
