import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { env } from "@/lib/env";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(env.supabaseUrl(), env.supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // This can fail in Server Components; session refresh is handled in middleware.
        }
      },
    },
  });
}
