**This phase is done**

# Phase 1 — Project Setup & Database Schema

## Status: Complete

## Tech Stack

- Next.js 16 with App Router and TypeScript
- Tailwind CSS for styling
- Supabase (Postgres) for database and auth
- shadcn/ui for components

## Tasks

1. Initialize a Next.js 16 project with TypeScript, Tailwind CSS, App Router
2. Install and configure: `@supabase/supabase-js` `@supabase/ssr` `shadcn/ui`
3. Set up folder structure:

   ```
   /app
     /dashboard
     /login
     /auth/callback
   /components
   /lib
     /supabase    (client + server + middleware helpers)
     /types.ts    (all TypeScript types)
   /hooks
   ```

4. Create `.env.local.example` with all required env vars:

   ```
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   ANTHROPIC_API_KEY=
   META_WEBHOOK_VERIFY_TOKEN=
   META_WEBHOOK_SECRET=
   META_PHONE_NUMBER_ID=
   META_ACCESS_TOKEN=
   ```

5. Generate `supabase/schema.sql` with these tables:

### WORKERS

| Column            | Type                 | Notes                                                            |
| ----------------- | -------------------- | ---------------------------------------------------------------- |
| id                | uuid PK              | default gen_random_uuid()                                        |
| name              | text NOT NULL        |                                                                  |
| phone             | text UNIQUE NOT NULL |                                                                  |
| address           | text                 |                                                                  |
| gender            | text                 | check: male, female                                              |
| shift             | text                 | check: day, afternoon, night                                     |
| availability_type | text                 | check: full-time, part-time                                      |
| available_days    | text[]               | nullable; only if part-time; values: mon/tue/wed/thu/fri/sat/sun |
| status            | text                 | default 'active'; check: active, inactive                        |
| notes             | text                 |                                                                  |
| created_at        | timestamptz          | default now()                                                    |
| updated_at        | timestamptz          | default now()                                                    |

### JOBS

| Column                | Type          | Notes                                          |
| --------------------- | ------------- | ---------------------------------------------- |
| id                    | uuid PK       | default gen_random_uuid()                      |
| title                 | text NOT NULL |                                                |
| location              | text NOT NULL |                                                |
| shift                 | text          | check: day, afternoon, night                   |
| description           | text          |                                                |
| safety_shoes_required | boolean       | default false                                  |
| status                | text          | default 'open'; check: open, filled, cancelled |
| created_at            | timestamptz   | default now()                                  |
| updated_at            | timestamptz   | default now()                                  |

### JOB_ASSIGNMENTS

| Column      | Type                 | Notes               |
| ----------- | -------------------- | ------------------- |
| id          | uuid PK              |                     |
| job_id      | uuid FK → jobs.id    | on delete cascade   |
| worker_id   | uuid FK → workers.id | on delete cascade   |
| assigned_at | timestamptz          | default now()       |
|             | UNIQUE               | (job_id, worker_id) |

### JOB_BROADCASTS

| Column       | Type                 | Notes                                    |
| ------------ | -------------------- | ---------------------------------------- |
| id           | uuid PK              |                                          |
| job_id       | uuid FK → jobs.id    |                                          |
| worker_id    | uuid FK → workers.id |                                          |
| response     | text                 | check: pending, yes, no; default pending |
| sent_at      | timestamptz          | default now()                            |
| responded_at | timestamptz          | nullable                                 |

### MESSAGES

| Column                  | Type                 | Notes                             |
| ----------------------- | -------------------- | --------------------------------- |
| id                      | uuid PK              |                                   |
| worker_id               | uuid FK → workers.id | nullable (null if unknown sender) |
| phone                   | text NOT NULL        |                                   |
| direction               | text                 | check: inbound, outbound          |
| body                    | text                 |                                   |
| is_availability_message | boolean              | default false                     |
| created_at              | timestamptz          | default now()                     |

6. RLS policies: enable on all tables; authenticated users get full SELECT/INSERT/UPDATE/DELETE; no public access.

7. Trigger: auto-update `updated_at` on workers and jobs on every UPDATE.

8. `/lib/types.ts` — TypeScript interfaces matching every table exactly.

9. Supabase client helpers:
   - `/lib/supabase/client.ts` — browser client
   - `/lib/supabase/server.ts` — server component client
   - `/lib/supabase/middleware.ts` — middleware client

10. `proxy.ts` at root (Next.js 16 renames middleware.ts → proxy.ts) — refreshes Supabase session on every request, redirects unauthenticated users away from `/dashboard` to `/login`.
    **This phase is done**
