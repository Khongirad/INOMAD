import { z } from 'zod';

/**
 * Zod schema for production environment variable validation.
 * Called at NestJS application bootstrap — prevents startup with invalid/missing config.
 *
 * Security principles:
 *   - JWT secret must be ≥ 32 chars (brute-force resistance)
 *   - No defaults for secrets in production
 *   - SERVER_SHARE_KEY required when NODE_ENV = 'production'
 */
export const EnvSchema = z.object({
  // ── Runtime ───────────────────────────────────────────────────
  NODE_ENV: z
    .enum(['development', 'staging', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),

  // ── Database ──────────────────────────────────────────────────
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required')
    .refine(
      (v) => v.startsWith('postgresql://') || v.startsWith('postgres://'),
      { message: 'DATABASE_URL must be a valid PostgreSQL connection string' },
    ),

  // ── Auth ──────────────────────────────────────────────────────
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters for security'),
  AUTH_JWT_SECRET: z
    .string()
    .min(32, 'AUTH_JWT_SECRET must be at least 32 characters for security'),
  JWT_EXPIRATION: z.string().default('7d'),

  // ── MPC Wallet (optional in dev, required in production) ───────
  SERVER_SHARE_KEY: z.string().optional(),

  // ── Blockchain ────────────────────────────────────────────────
  ALTAN_RPC_URL: z.string().url().optional(),
  ALTAN_CHAIN_ID: z.coerce.number().int().optional(),
  CONTRACT_ADDRESS: z.string().optional(),

  // ── Admin (optional) ──────────────────────────────────────────
  ADMIN_SECRET: z.string().optional(),
  WEBHOOK_SECRET: z.string().optional(),

  // ── External APIs (optional) ──────────────────────────────────
  OPENAI_API_KEY: z.string().optional(),

  // ── Logging ──────────────────────────────────────────────────
  LOG_LEVEL: z
    .enum(['error', 'warn', 'log', 'debug', 'verbose'])
    .default('log'),
}).superRefine((data, ctx) => {
  // Production-only additional requirements
  if (data.NODE_ENV === 'production') {
    if (!data.SERVER_SHARE_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['SERVER_SHARE_KEY'],
        message: 'SERVER_SHARE_KEY is required in production (MPC wallet encryption)',
      });
    }
    if (!data.ALTAN_RPC_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ALTAN_RPC_URL'],
        message: 'ALTAN_RPC_URL is required in production',
      });
    }
    if (!data.ALTAN_CHAIN_ID) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ALTAN_CHAIN_ID'],
        message: 'ALTAN_CHAIN_ID is required in production',
      });
    }
  }
});

export type ParsedEnv = z.infer<typeof EnvSchema>;

/**
 * Validates process.env at application startup.
 * Throws a descriptive error and halts startup if any variable is invalid.
 *
 * Usage in main.ts:
 *   import { validateEnv } from './config/env.validation';
 *   validateEnv(process.env);
 */
export function validateEnv(env: Record<string, unknown>): ParsedEnv {
  const result = EnvSchema.safeParse(env);

  if (!result.success) {
    const errors = result.error.issues
      .map((e) => `  • ${e.path.join('.')}: ${e.message}`)
      .join('\n');

    throw new Error(
      `\n\n🚨 Invalid environment configuration:\n\n${errors}\n\n` +
      `Please check your .env file or environment variables.\n`,
    );
  }

  return result.data;
}
