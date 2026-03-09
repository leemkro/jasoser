function required(name: string, value: string | undefined) {
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

const NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const env = {

  supabaseUrl: () =>
    NEXT_PUBLIC_SUPABASE_URL ?? required("SUPABASE_URL", process.env.SUPABASE_URL),
  supabaseAnonKey: () =>
    NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    required("SUPABASE_ANON_KEY", process.env.SUPABASE_ANON_KEY),
  stripeSecretKey: () => required("STRIPE_SECRET_KEY", process.env.STRIPE_SECRET_KEY),
  stripeWebhookSecret: () =>
    required("STRIPE_WEBHOOK_SECRET", process.env.STRIPE_WEBHOOK_SECRET),
  tossClientKey: () => required("NEXT_PUBLIC_TOSS_CLIENT_KEY", process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY),
  tossSecretKey: () => required("TOSS_SECRET_KEY", process.env.TOSS_SECRET_KEY),
  appUrl: () => process.env.NEXT_PUBLIC_APP_URL,
  supabaseServiceRoleKey: () => process.env.SUPABASE_SERVICE_ROLE_KEY,
};
