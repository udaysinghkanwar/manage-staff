# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev       # start dev server
npm run build     # production build (also runs type generation)
npm run lint      # ESLint
npx tsc --noEmit  # type-check without building
```

There are no tests yet.

## Next.js 16 Breaking Changes

**Before writing any Next.js code, read the relevant guide in `node_modules/next/dist/docs/`.**

Critical differences from earlier versions:

- **`middleware.ts` is renamed to `proxy.ts`** — the exported function must be named `proxy`, not `middleware`. The existing file is at `proxy.ts`.
- **`params` and `searchParams` in pages/layouts are `Promise<...>`** — must be `await`-ed or read via React's `use()`.
- **`LayoutProps` and `PageProps`** are globally available type helpers (no import needed); use `LayoutProps<'/path'>` and `PageProps<'/path/[param]'>` for typed props.

## Architecture

### Auth & Session Flow

Authentication is magic-link only (single shared email account). Session handling is split across three Supabase client helpers:

- `lib/supabase/client.ts` — browser client (`createBrowserClient`); used in Client Components and hooks
- `lib/supabase/server.ts` — async server client (`createServerClient` + `cookies()`); used in Server Components, Route Handlers, and Server Actions
- `lib/supabase/middleware.ts` — `updateSession()` called from `proxy.ts`; refreshes the session on every request and redirects unauthenticated users away from `/dashboard`

**Use `getUser()` for all authorization checks** — `getSession()` returns unverified cookie data and must not be used for access decisions.

The auth callback route (`app/auth/callback/route.ts`) exchanges the OTP code for a session and redirects to `/dashboard`.

### Database

Supabase (Postgres). Schema is in `supabase/schema.sql` — run it in the Supabase SQL editor to initialize. All tables have RLS enabled; authenticated users get full CRUD, no public access.

Five tables: `workers`, `jobs`, `job_assignments`, `job_broadcasts`, `messages`. TypeScript interfaces for all tables live in `lib/types.ts`.

Server-side webhook handlers (Phase 5+) must use the **service role key** (`SUPABASE_SERVICE_ROLE_KEY`) to bypass RLS — never the anon key.

### WhatsApp Integration

Inbound messages arrive at `/app/api/whatsapp/incoming` from Meta Cloud API. The pipeline is:
1. Verify `X-Hub-Signature-256` (HMAC-SHA256 with `META_WEBHOOK_SECRET`)
2. Detect YES/NO replies → update `job_broadcasts`
3. Keyword filter (`lib/whatsapp/keyword-filter.ts`) — must match ≥2 categories to count as availability message
4. If availability: call Claude parser (`lib/whatsapp/claude-parser.ts`) → upsert worker record
5. Always log to `messages` table

Outbound messages go through `/app/api/whatsapp/send` → Meta Cloud API using `META_ACCESS_TOKEN` and `META_PHONE_NUMBER_ID`.

### UI Components

shadcn/ui with the `base-nova` style, neutral base color, CSS variables enabled. Add components via:
```bash
npx shadcn add <component>
```
Icon library is `lucide-react`. Path alias `@/` maps to the project root.

The `Button` component uses `@base-ui/react` — it has **no `asChild` prop**. To style a `<Link>` as a button, import `buttonVariants` and apply it directly: `<Link className={cn(buttonVariants(), '...')}>`.

### Build Plan

Phase specs live in `docs/phases/`. Current status:
- Phase 1 (setup + schema): **complete**
- Phase 2 (auth flow): **complete**
- Phase 3 (workers section): **complete**
- Phase 4 (jobs section): **complete**
- Phase 5 (WhatsApp inbound): **complete**
- Phase 6 (broadcast system): **complete**
- Phase 7 (polish + inbox): **complete** — implement them in order; each phase doc lists exact files and requirements
