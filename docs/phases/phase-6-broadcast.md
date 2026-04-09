# Phase 6 — Broadcast System & YES/NO Response Handling

## Status: Pending

## Context
Phases 1–5 are complete.

Dad selects matched workers on a job detail page and hits Broadcast. System sends a WhatsApp template message to each selected worker. Workers reply YES or NO. The webhook (Phase 5) is extended to catch YES/NO replies. `job_broadcasts` table tracks who was sent, their response, and when they responded. When a worker confirms (YES + dad assigns): insert to `job_assignments`.

## Tasks

### 1. `/app/api/whatsapp/send/route.ts` (POST)
- Receives: `{ to: string, templateName: string, templateParams: string[] }`
- Calls Meta Cloud API: `POST https://graph.facebook.com/v18.0/{META_PHONE_NUMBER_ID}/messages`
- Uses Bearer token from `META_ACCESS_TOKEN` env var
- Template message body format per Meta Cloud API spec
- Returns: `{ messageId, success }`
- Logs outbound message to `messages` table

### 2. `/lib/whatsapp/broadcast.ts`
```ts
function broadcastJob(jobId: string, workerIds: string[]): Promise<BroadcastResult>
```
- Fetch job details from Supabase
- Fetch worker details (name, phone) for each workerId
- For each worker:
  - Send WhatsApp template via `/api/whatsapp/send`
  - Insert row into `job_broadcasts`: `{ job_id, worker_id, response: 'pending', sent_at: now() }`
- Return: `{ sent: number, failed: string[] }`

Template message (hardcoded structure, variable values):
```
Hi [worker_name], a new job is available:
Job: [job_title]
Location: [job_location]
Shift: [shift]
Safety shoes: [yes/no]
Description: [description]
Reply YES if you're interested or NO to pass.
```

### 3. Extend `/app/api/whatsapp/incoming/route.ts` (from Phase 5)
Add YES/NO detection **before** the keyword filter:
- Normalize message: trim, lowercase
- If message is exactly `yes`, `no`, `yeah`, `nope`, `y`, `n`:
  - Find most recent `job_broadcast` for this worker's phone with `response = 'pending'`
  - Update `job_broadcasts`: set `response = 'yes'/'no'`, `responded_at = now()`
  - Log to `messages` table
  - Do NOT run keyword filter or Claude on this message
  - Return early

### 4. Wire up Broadcast button in `/app/dashboard/jobs/[id]/page.tsx`
Replace Phase 4 placeholder with real functionality:
- Collect selected worker IDs from checkboxes
- Confirmation dialog: "Send job details to X workers?"
- On confirm: call `broadcastJob(jobId, workerIds)`
- Success toast: "Sent to X workers"
- Refresh the broadcast results section

### 5. Broadcast results section in `/app/dashboard/jobs/[id]/page.tsx`
Show table/list of all `job_broadcasts` for this job:
- Worker name + phone
- Sent at time
- Response badge: Pending (gray) / YES (green) / NO (red)
- For YES responses: "Assign" button → calls `assignWorker(jobId, workerId)` from Phase 4
- **Realtime**: Supabase Realtime subscription on `job_broadcasts` filtered by `job_id` — page updates live when a worker replies

### 6. Quick assign without broadcast
Keep Phase 4 "Assign directly" button working alongside broadcast flow.

When a worker is assigned (either via broadcast YES + Assign, or direct assign):
- They appear in the Assigned Workers section
- They no longer appear as available in the matched workers list
- Their record reflects they're on a job
