# Staff Manager

An internal dashboard for a staffing agency to manage workers, post jobs, match workers to jobs, and communicate via WhatsApp. Workers text in their availability naturally — Claude parses it automatically.

## What it does

- **Workers**: Add and manage workers with shift preferences, availability, and location. Workers can also text in their availability via WhatsApp and be auto-registered after a guided onboarding reply.
- **Companies**: Track client companies with structured addresses, used as the location for jobs.
- **Jobs**: Create job postings (one-off or full-time/ongoing), auto-match workers by shift/location/availability, broadcast job offers via WhatsApp template messages, track YES/NO replies, and assign workers.
- **Inbox**: Realtime WhatsApp conversation log with reply capability and optimistic sending.
- **Landing page + waitlist**: Public marketing page with email capture that writes to a `waitlist` table.

## Tech stack

Next.js 16 (App Router) · React 19 · Supabase (Postgres + Auth + Realtime) · Tailwind v4 · shadcn/ui (base-nova) · Anthropic SDK · Meta WhatsApp Cloud API · Vercel.

## Running locally

**1. Clone and install**
```bash
git clone <your-repo>
cd manage-staff
npm install
```

**2. Set up environment variables**
```bash
cp .env.local.example .env
```
Fill in the values (see Environment Variables below).

**3. Run the database schema**

Go to [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql) and run the contents of `supabase/schema.sql`. Then apply migrations:
```bash
npm run db:push
```

**4. Start the dev server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role key |
| `SUPABASE_DB_URL` | Supabase → Settings → Database → Connection string (Transaction mode) |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) |
| `META_WEBHOOK_VERIFY_TOKEN` | Any string you choose — enter the same value in Meta's webhook config |
| `META_WEBHOOK_SECRET` | Meta Developer Console → App Settings → Basic → App Secret |
| `META_PHONE_NUMBER_ID` | Meta Developer Console → WhatsApp → API Setup → Phone Number ID |
| `META_ACCESS_TOKEN` | Meta Developer Console → WhatsApp → API Setup → Access Token |
| `NEXT_PUBLIC_DEV_BYPASS_AUTH` | Set to `true` locally to show a dev "skip login" button. Always `false` in production. |

`VERCEL_URL` is auto-injected by Vercel — do not set it manually. It's used by internal server-to-server calls (e.g. broadcast → `/api/whatsapp/send`) via [lib/get-base-url.ts](lib/get-base-url.ts).

## Authentication

Email + password only. **Public sign-ups are disabled** — accounts are created manually in Supabase Studio (Authentication → Users → Add user). Each company employee gets their own login.

`getUser()` is used for all authorization checks; session refresh runs on every request via [proxy.ts](proxy.ts).

## Database migrations

Migrations live in [supabase/migrations/](supabase/migrations/) and are applied with the Supabase CLI.

```bash
# Push pending migrations to remote database
npm run db:push

# Create a new migration file
npm run db:migration:new your_description_here

# Mark a migration as already applied (ran manually)
npm run db:repair <timestamp>
```

## Testing the webhook locally

The test script simulates WhatsApp messages without needing a real phone:

```bash
npm run dev          # terminal 1
npm run test:webhook # terminal 2
```

To test with a real WhatsApp number, expose your local server:

```bash
# ngrok
ngrok http 3000

# or Cloudflare Tunnel
cloudflared tunnel --url http://localhost:3000
```

Set the resulting URL as your webhook in Meta Developer Console:
`https://your-tunnel-url/api/whatsapp/incoming`

## Connecting a real WhatsApp number

1. Go to [Meta Developer Console](https://developers.facebook.com)
2. Create an app → Add WhatsApp product
3. Register a phone number (must not already be on WhatsApp)
4. Fill in `META_PHONE_NUMBER_ID` and `META_ACCESS_TOKEN`
5. Create an approved message template named `job_broadcast` with **8 body parameters** in this order:
   1. Worker name
   2. Job title
   3. Job date (or "Full-time / Ongoing")
   4. Company name
   5. Company address
   6. Shift
   7. Safety shoes required (Yes/No)
   8. Description
6. Configure webhook URL: `https://your-app/api/whatsapp/incoming`
7. Set `META_WEBHOOK_VERIFY_TOKEN` and `META_WEBHOOK_SECRET` (App Secret) in your env

Free-form replies (inbox, confirmations, onboarding) are sent as plain text and only work inside Meta's 24-hour customer service window — outside that window only approved templates can be sent.

See [Meta WhatsApp Cloud API docs](https://developers.facebook.com/docs/whatsapp/cloud-api) for full details.

## Deployment

1. Push to GitHub
2. Connect repo in [Vercel](https://vercel.com) — auto-deploys on every push to `main`
3. Add all environment variables in Vercel → Project → Settings → Environment Variables
4. Set `NEXT_PUBLIC_DEV_BYPASS_AUTH=false` in production
5. After the first deploy, update Meta's webhook callback URL to `https://<your-domain>/api/whatsapp/incoming`
