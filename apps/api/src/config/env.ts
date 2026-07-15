import 'dotenv/config';

import { z } from 'zod';

const optionalString = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().optional(),
);

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
  MONGODB_URI: z.string().min(1),
  CLIENT_URL: z.string().url(),
  ACCESS_TOKEN_SECRET: z.string().min(32),
  REFRESH_TOKEN_SECRET: z.string().min(32),
  ACCESS_TOKEN_EXPIRY: z.string().min(2).default('15m'),
  REFRESH_TOKEN_EXPIRY: z.string().min(2).default('30d'),
  COOKIE_SECRET: z.string().min(32),
  SMTP_HOST: optionalString,
  SMTP_PORT: z.coerce.number().int().min(1).max(65_535).default(587),
  SMTP_USER: optionalString,
  SMTP_PASSWORD: optionalString,
  SMTP_FROM: z.string().min(3).default('NexOps AI <no-reply@nexops.local>'),
  EMAIL_ENABLED: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .default('false'),
  AI_PROVIDER: z.enum(['mock', 'openai', 'gemini']).default('mock'),
  OPENAI_API_KEY: optionalString,
  GEMINI_API_KEY: optionalString,
  CLOUDINARY_CLOUD_NAME: optionalString,
  CLOUDINARY_API_KEY: optionalString,
  CLOUDINARY_API_SECRET: optionalString,
  STORAGE_PROVIDER: z.enum(['local', 'cloudinary', 's3']).default('local'),
  LOCAL_STORAGE_PATH: z.string().min(1).default('./uploads'),
  REDIS_URL: optionalString,
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

export type Environment = z.infer<typeof environmentSchema>;

export function loadEnvironment(source: NodeJS.ProcessEnv = process.env): Environment {
  const result = environmentSchema.safeParse(source);

  if (!result.success) {
    const issues = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`Invalid environment configuration:\n${issues.join('\n')}`);
  }

  if (result.data.AI_PROVIDER === 'openai' && !result.data.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required when AI_PROVIDER=openai');
  }

  if (result.data.AI_PROVIDER === 'gemini' && !result.data.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is required when AI_PROVIDER=gemini');
  }

  if (
    result.data.STORAGE_PROVIDER === 'cloudinary' &&
    (!result.data.CLOUDINARY_CLOUD_NAME ||
      !result.data.CLOUDINARY_API_KEY ||
      !result.data.CLOUDINARY_API_SECRET)
  ) {
    throw new Error('Cloudinary credentials are required when STORAGE_PROVIDER=cloudinary');
  }

  return result.data;
}
