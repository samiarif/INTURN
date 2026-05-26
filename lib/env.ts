type RequiredEnvKey =
  | 'DATABASE_URL'
  | 'CLERK_SECRET_KEY'
  | 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'
  | 'CLERK_WEBHOOK_SECRET'
  | 'BLOB_READ_WRITE_TOKEN'
  | 'RESEND_API_KEY'
  | 'EMAIL_FROM'
  | 'ANTHROPIC_API_KEY';

export function requireEnv(name: RequiredEnvKey): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
