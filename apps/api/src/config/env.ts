import { config as loadEnvFile } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

// Load monorepo root .env (apps/api/src/config → ../../../../.env)
const repoRoot = resolve(fileURLToPath(new URL('../../../..', import.meta.url)));
loadEnvFile({ path: resolve(repoRoot, '.env') });

// Validates all required environment variables at startup.
// If any variable is missing, the process exits immediately with a clear error.

const EnvSchema = z.object({
  // Discord
  DISCORD_CLIENT_ID: z.string().min(1, 'DISCORD_CLIENT_ID is required'),
  DISCORD_CLIENT_SECRET: z.string().min(1, 'DISCORD_CLIENT_SECRET is required'),

  // LiveKit
  LIVEKIT_URL: z.string().url('LIVEKIT_URL must be a valid URL (ws:// or wss://)'),
  // Public URL returned to browser clients (may differ from internal Docker URL)
  LIVEKIT_PUBLIC_URL: z.string().url().optional(),
  LIVEKIT_API_KEY: z.string().min(1, 'LIVEKIT_API_KEY is required'),
  LIVEKIT_API_SECRET: z.string().min(1, 'LIVEKIT_API_SECRET is required'),
  LIVEKIT_TOKEN_TTL: z.coerce.number().int().positive().default(3600),

  // Server
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().default('https://discord.com'),
});

function loadEnv() {
  const result = EnvSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid environment configuration:');
    result.error.errors.forEach((err) => {
      console.error(`  • ${err.path.join('.')}: ${err.message}`);
    });
    process.exit(1);
  }

  return result.data;
}

export const env = loadEnv();
export type Env = typeof env;
