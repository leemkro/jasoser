import { createClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";

export function createSupabaseAdminClient() {
  const serviceRoleKey = env.supabaseServiceRoleKey();

  if (!serviceRoleKey) {
    return null;
  }

  return createClient(env.supabaseUrl(), serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
