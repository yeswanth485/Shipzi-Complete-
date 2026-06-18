// Loads and validates all environment variables at startup. Throw if any required var is missing.

const isTest = process.env.NODE_ENV === 'test';

const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'RAZORPAY_WEBHOOK_SECRET',
  'FRONTEND_URL',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
  'JWT_SECRET',
] as const;

function validateEnv(): void {
  if (isTest) return; // Skip validation during tests
  const missing: string[] = [];
  for (const key of requiredEnvVars) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  // JWT_SECRET must be strong in ALL environments (not just production)
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters');
  }
  // Warn about weak secrets in development
  const jwtSecret = process.env.JWT_SECRET;
  if ((process.env.NODE_ENV || 'development') === 'development' && jwtSecret && jwtSecret.length < 64) {
    console.warn('[SECURITY] JWT_SECRET is weak for development. Use 64+ characters.');
  }
}

function parsePort(value: string | undefined): number {
  const port = parseInt(value || '5000', 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT value: ${value}`);
  }
  return port;
}

validateEnv();

export const CONFIG = {
  NODE_ENV: (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test',
  PORT: parsePort(process.env.PORT),

  SUPABASE_URL: process.env.SUPABASE_URL!,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',

  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID!,
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET!,
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET!,

  JWT_SECRET: process.env.JWT_SECRET!,
  FRONTEND_URL: process.env.FRONTEND_URL!,

  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID!,
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL!,
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY!,

  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim())
    : [
        process.env.FRONTEND_URL!,
        'https://shipzi.vercel.app',
        'http://localhost:3000',
      ].filter(Boolean),

  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
} as const;

export type Config = typeof CONFIG;
