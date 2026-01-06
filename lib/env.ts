import { z } from "zod";

const envSchema = z.object({
  OPENROUTER_API_KEY: z.string().min(1, "OPENROUTER_API_KEY required"),
  OPENROUTER_BASE_URL: z.string().url().default("https://openrouter.ai/api/v1"),
  OPENROUTER_MODEL: z.string().default("xiaomi/mimo-v2-flash:free"),
  EXA_API_KEY: z.string().min(1, "EXA_API_KEY required"),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  const result = envSchema.safeParse({
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    OPENROUTER_BASE_URL: process.env.OPENROUTER_BASE_URL,
    OPENROUTER_MODEL: process.env.OPENROUTER_MODEL,
    EXA_API_KEY: process.env.EXA_API_KEY,
  });

  if (!result.success) {
    throw new Error(
      `Missing env: ${result.error.issues.map((i) => i.message).join(", ")}`
    );
  }

  return result.data;
}
