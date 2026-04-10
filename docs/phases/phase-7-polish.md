# Phase 7 — Inbox, Error Handling, Empty States & Polish

## Status: Complete

## Context
Phases 1–6 are complete. This is the final phase.

## Tasks

### 1. `/app/dashboard/inbox/page.tsx` — Message inbox
- Fetch all messages from `messages` table where `is_availability_message = false`
- Group by worker (phone number)
- Conversation list shows:
  - Worker name (or phone if no worker record)
  - Last message preview
  - Timestamp
  - Unread indicator (inbound messages in last 24h)
- Tap a conversation → expand to full message thread
- Inbound vs outbound messages styled differently (iMessage-style bubbles)
- "Reply" text input at bottom of thread
  - On send: call `/api/whatsapp/send` with plain text message (valid within 24h service window)
  - Log as outbound message

### 2. Error handling across all pages
- `/app/dashboard/error.tsx` — catches errors, shows friendly message
- `/app/dashboard/workers/loading.tsx` — skeleton loading state
- `/app/dashboard/jobs/loading.tsx` — skeleton loading state
- All server actions return `{ success, error }` and surface errors as toast notifications
- If WhatsApp send fails: show error toast, do not insert `job_broadcast` row

### 3. Empty states on every list page
- Workers list empty: "No workers yet. Add your first worker to get started."
- Jobs list empty: "No jobs yet. Create your first job posting."
- Inbox empty: "No messages yet."
- Job has no matched workers: "No workers match this job's shift. Try changing the shift or assign a worker directly."

### 4. Dashboard home stats bar
`/app/dashboard/page.tsx` — before redirecting to workers, show a simple stats bar:
- Total active workers
- Workers currently assigned
- Open jobs
- Workers who replied YES in last 7 days

Single Supabase query each for performance.

### 5. Mobile nav polish
- Active state on current nav item
- Bottom safe area padding on mobile (`env(safe-area-inset-bottom)`)
- Prevent layout shift on load

### 6. `/lib/env.ts` — Environment variable validation
- Check all required env vars exist at boot
- If any missing: throw a clear error naming which var is missing
- Prevents silent failures in production

### 7. `README.md`
Cover:
- What the app does (2 sentences)
- How to run locally (step by step)
- All environment variables and where to get each value
- How to run the schema in Supabase
- How to test the webhook locally (mention ngrok or Cloudflare tunnel)
- How to connect a real WhatsApp number (point to Meta docs)
- Deployment: push to GitHub, Vercel auto-deploys
