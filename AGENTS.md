# AGENTS.md

Operational guide for coding agents working in `C:\toyworkspace\jasoser`.

## 1) Repository Snapshot

- Stack: Next.js 15 App Router + React 19 + TypeScript + Tailwind CSS v4.
- Data/Auth: Supabase (`@supabase/ssr`, `@supabase/supabase-js`).
- Billing: Stripe (`stripe`, `@stripe/stripe-js`).
- AI generation: Gemini API (server-side via `fetch`).
- UI primitives: shadcn-style components in `components/ui` (Radix + CVA).
- Package manager in use: `npm` (lockfile present).

## 2) Rule Files Check

Checked for higher-priority instruction files:

- `.cursor/rules/**`
- `.cursorrules`
- `.github/copilot-instructions.md`

None are present right now.

If these files are added later, treat them as higher priority than this file.

## 3) Command Matrix

Run all commands from repo root: `C:\toyworkspace\jasoser`.

### Core scripts

- Dev: `npm run dev`
- Build: `npm run build`
- Start: `npm run start`
- Lint: `npm run lint`

### Verified status

- `npm run lint` works (runs `eslint .`).
- `npm run build` works and is the best full-project verification command.
- Build depends on required env vars (see Environment section).

### Typecheck guidance

- No dedicated `typecheck` script exists.
- Use `npm run build` as source-of-truth type validation.
- Avoid treating raw `npx tsc --noEmit` as source-of-truth in this repo.

## 4) Test Commands (Current Reality)

- There is no `test` script in `package.json`.
- No test runner config is present (Jest/Vitest/Playwright/Cypress/etc.).
- No `*.test.*` / `*.spec.*` files exist.

Implications:

- No repo-native full test command exists today.
- No single-test command exists today.
- Do not invent test commands in docs or automation.

If tests are added later, update this file with:

- full suite command
- single file command
- single test name command
- watch command

## 5) Recommended Verification Flow

Use this order after code changes:

1. `npm run lint`
2. `npm run build`

If a command fails due to missing env/config, report that clearly.

## 6) Environment Requirements

Required for normal app behavior:

- `GEMINI_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

Common optional/supporting values:

- `GEMINI_MODEL` (default in code: `gemini-1.5-flash`)
- `NEXT_PUBLIC_APP_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (webhook/admin sync path)

Reference template: `.env.example`.

## 7) Project Structure Conventions

- App routes: `app/**/page.tsx`
- API routes: `app/api/**/route.ts`
- Auth callback: `app/auth/callback/route.ts`
- Shared server/client utilities: `lib/**`
- Hooks: `hooks/**`
- Reusable UI primitives: `components/ui/**`
- Feature components: `components/**`
- SQL schema and policies: `supabase/schema.sql`

Keep this organization unless there is a strong reason to change it.

## 8) Import and Module Style

- Use ES module imports/exports.
- Use double quotes and semicolons.
- Prefer `import type` for type-only imports.
- Keep one blank line between external imports and internal `@/*` imports.
- Use `@/*` alias for internal paths (configured in `tsconfig.json`).
- Remove unused imports.

## 9) Formatting Style

- Use 2-space indentation.
- Keep JSX readable; split long props across lines.
- Keep blank lines purposeful, not dense.
- Do not align with manual spacing.
- No Prettier config exists; follow current file formatting patterns.

## 10) TypeScript Rules

- `strict: true` is enabled; maintain strict typing.
- Avoid `any`, `@ts-ignore`, `@ts-expect-error`.
- Validate external input with Zod at boundaries.
- Use explicit interfaces/types for shared data contracts.
- Keep config objects typed where appropriate (`Metadata`, `NextConfig`, etc.).

## 11) Naming Rules

- React components: PascalCase (`CreatePage`, `GenerationResult`).
- Variables/functions: camelCase.
- Route file names: framework defaults (`page.tsx`, `layout.tsx`, `route.ts`).
- CSS custom properties: kebab-case.
- Prefer clear domain names over short abbreviations.

## 12) Styling and UI Rules

- Tailwind utility classes are the primary styling method.
- Keep global CSS in `app/globals.css` minimal and token-focused.
- Reuse existing UI primitives in `components/ui` before adding new ones.
- Keep mobile responsiveness in layout/components by default.
- Keep Korean UI copy user-facing and consistent with existing tone.

## 13) Error Handling Rules

- Prefer early returns and guard clauses.
- For API routes: return structured `NextResponse.json` with proper status codes.
- For client actions: show user-friendly errors via `sonner` toast.
- Never swallow errors silently.
- Throw clear errors for missing required env vars in central env helpers.

## 14) Security and Boundary Rules

- Do not expose secret keys to client code.
- Keep AI calls, Stripe secret operations, and privileged updates server-side.
- Treat middleware as routing guard, not sole authorization layer.
- Keep Supabase admin operations restricted to server-only paths.

## 15) Practical Defaults for Agents

- Make minimal, surgical changes aligned with existing patterns.
- Prefer updating existing helpers/components over introducing parallel patterns.
- Keep API contracts stable when editing client/server integration.
- After edits, run lint/build and report exact outcomes.
- Update this file when command reality or architecture changes.
