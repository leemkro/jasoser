# AGENTS.md

Operational guide for coding agents working in `C:\toyworkspace\jasoser`.

## 1) Repository Snapshot

- **Stack**: Next.js 15 App Router + React 19 + TypeScript + Tailwind CSS v4 (via `@tailwindcss/postcss`).
- **Data/Auth**: Supabase (`@supabase/ssr`, `@supabase/supabase-js`). Google OAuth + email/password.
- **Payments**: Stripe (`stripe`, `@stripe/stripe-js`) **and** PortOne (`https://cdn.iamport.kr/v1/iamport.js` + server verification API).
- **AI generation**: OpenAI API (server-side `fetch` to `https://api.openai.com/v1/chat/completions`). See `lib/openai.ts`.
- **Forms**: `react-hook-form` + `@hookform/resolvers` + `zod`.
- **Data fetching**: Server components use Supabase directly; client components use `swr` or `fetch`.
- **UI primitives**: shadcn-style in `components/ui/` (Radix + CVA + `cn()` utility).
- **Icons**: `lucide-react`.
- **Toasts**: `sonner`.
- **Package manager**: `npm` (lockfile present).

## 2) Rule Files Check

No `.cursor/rules/**`, `.cursorrules`, or `.github/copilot-instructions.md` files are present.
If added later, treat them as higher priority than this file.

## 3) Command Matrix

Run all commands from repo root.

| Action    | Command          | Notes                                          |
|-----------|------------------|-------------------------------------------------|
| Dev       | `npm run dev`    | Starts Next.js dev server                       |
| Build     | `npm run build`  | **Best full-project verification** (types + lint)|
| Start     | `npm run start`  | Production server                               |
| Lint      | `npm run lint`   | Runs `eslint .`                                 |

- No `typecheck` script; use `npm run build` as type-check source of truth.
- Build requires env vars (see section 6).

## 4) Test Commands

- No test runner, config, or test files exist.
- Do not invent test commands. Update this file if tests are added.

## 5) Verification Flow

After code changes, run in order:

1. `npm run lint`
2. `npm run build`

Report failures clearly, especially if caused by missing env/config.

## 6) Environment Variables

All env access goes through `lib/env.ts` (lazy getters with `required()` guard). Always use `env.*()` instead of raw `process.env`.

**Required**:
- `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_ANON_KEY`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_PORTONE_STORE_ID`, `PORTONE_API_KEY`, `PORTONE_API_SECRET`

**Optional**:
- `NEXT_PUBLIC_APP_URL` (defaults to request origin)
- `NEXT_PUBLIC_PORTONE_PG_PROVIDER` (PortOne 결제 PG사 식별자)
- `SUPABASE_SERVICE_ROLE_KEY` (admin operations, webhooks)

**Required for AI generation**
- `OPENAI_API_KEY`
- `OPENAI_MODEL` (optional, default: `gpt-4o-mini`)

## 7) Project Structure

```
app/                      # Next.js App Router
  api/                    # API routes (generate, stripe, portone, webhooks)
  auth/callback/          # Supabase auth callback
  (billing|create|dashboard|pricing|success)/  # Page routes (pricing UI temporarily disabled)
  layout.tsx              # Root layout (server component, Korean locale)
  globals.css             # Tailwind + CSS tokens + keyframes
components/               # Feature components (auth-panel, generation-result, etc.)
  ui/                     # Reusable UI primitives (button, card, input, etc.)
hooks/                    # Client hooks (use-user, use-supabase)
lib/                      # Shared utilities
  env.ts                  # Centralized env access (ALWAYS use this)
  openai.ts               # AI generation (OpenAI API)
  stripe.ts               # Stripe client singleton
  portone.ts              # PortOne API helpers
  types.ts                # Shared domain types
  utils.ts                # cn() utility
  supabase/               # Supabase clients (server, browser, admin, middleware)
types/                    # Type declarations for untyped packages
supabase/schema.sql       # DB schema + RLS policies
check-usage.mjs           # Dev utility script for inspecting user usage
```

## 8) Import and Module Style

- ES module imports/exports.
- Double quotes, semicolons.
- `import type` for type-only imports.
- One blank line between external imports and internal `@/*` imports.
- Use `@/*` path alias (configured in `tsconfig.json`).
- Remove unused imports.

```typescript
// External imports first
import { NextResponse } from "next/server";
import { z } from "zod";

// Then internal imports after blank line
import { generateEssay } from "@/lib/openai";
import { createSupabaseServerClient } from "@/lib/supabase/server";
```

## 9) Component Patterns

- **Server components** (default): Pages like `layout.tsx`, `dashboard/page.tsx`. Use `async function` + `await` Supabase calls.
- **Client components**: Start with `"use client"` directive. Use hooks, browser APIs, event handlers.
- **Conditional rendering**: Use ternary `{condition ? <X /> : null}`, not `{condition && <X />}`.
- **Form handling**: `react-hook-form` + `zodResolver` pattern. See `create/page.tsx`.
- **Supabase clients**: Server → `createSupabaseServerClient()`, Browser → `createSupabaseBrowserClient()`, Admin → `createSupabaseAdminClient()`.
- **UI components**: `React.forwardRef` + CVA variants + `cn()` for className merging.

## 10) Formatting Style

- 2-space indentation.
- Split long JSX props across lines.
- Purposeful blank lines, not dense.
- No Prettier config; follow existing file patterns.
- No manual alignment spacing.

## 11) TypeScript Rules

- `strict: true` enabled; maintain strict typing.
- **Never** use `any`, `@ts-ignore`, `@ts-expect-error`.
- Validate external input with Zod at API boundaries (see `api/generate/route.ts`).
- Use explicit interfaces/types for shared data contracts (see `lib/types.ts`).
- Put module type declarations in `types/` directory.

## 12) Naming Rules

- React components: PascalCase (`CreatePage`, `GenerationResult`).
- Variables/functions: camelCase.
- Route files: framework defaults (`page.tsx`, `layout.tsx`, `route.ts`).
- CSS custom properties: kebab-case.
- Prefer clear domain names over abbreviations.

## 13) Styling and UI

- Tailwind utility classes as primary styling method.
- Global CSS in `app/globals.css` — minimal, token-focused, with `@theme inline` blocks.
- Reuse `components/ui/` primitives before creating new ones.
- Mobile-responsive by default.
- Korean UI copy, consistent tone (`lang="ko"`, dates with `ko-KR` locale).

## 14) Error Handling

- Early returns and guard clauses.
- API routes: return `NextResponse.json({ error: "..." }, { status: N })`.
- Client: show user-friendly Korean errors via `toast.error()` from sonner.
- Never swallow errors silently (empty `catch {}` forbidden).
- Use `lib/env.ts` `required()` helper for missing env vars.

## 15) Security and Boundaries

- Never expose secret keys to client code.
- AI calls, Stripe/PortOne secret operations → server-side only.
- Middleware is routing guard, not sole authorization (always verify `auth.getUser()` in API routes). Authenticated users on `/` are redirected to `/create`.
- Supabase admin client → server-only paths.
- RLS enabled on all tables (see `supabase/schema.sql`).

## 16) Practical Defaults for Agents

- Make minimal, surgical changes aligned with existing patterns.
- Prefer updating existing helpers/components over parallel patterns.
- Keep API contracts stable when editing client/server integration.
- After edits, run `npm run lint` then `npm run build` and report outcomes.
- Update this file when commands, architecture, or env vars change.
