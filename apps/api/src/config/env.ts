import { z } from 'zod';

const Schema = z.object({
  NODE_ENV: z.enum(['production', 'development', 'test']).default('production'),
  PORT: z.string().optional(),
  LOG_LEVEL: z.string().optional(),
  CORS_ORIGIN: z.string().optional(),
  RATE_LIMIT_WINDOW_MS: z.string().optional(),
  RATE_LIMIT_MAX: z.string().optional(),
});

export const env = Schema.parse(process.env);
