# Phase 5 — WhatsApp Inbound Handling (Webhook + Claude Parser)

## Status: Complete

## Context
Phases 1–4 are complete.

Incoming WhatsApp messages arrive as POST requests from Meta to `/api/whatsapp/incoming`. Claude parses availability messages into structured data. Claude is only called if a keyword filter says the message looks like an availability update. All messages are logged to the `messages` table.

Example worker message: "Hi my name is James, I live in Brampton, I can work day shift, available Monday Wednesday Friday"

## Tasks

### 1. `/app/api/whatsapp/incoming/route.ts`

**GET handler** (webhook verification):
- Meta sends: `hub.mode`, `hub.verify_token`, `hub.challenge`
- If `hub.verify_token` matches `META_WEBHOOK_VERIFY_TOKEN` env var → return `hub.challenge` as plain text
- Otherwise return 403

**POST handler** (incoming messages):
- Parse Meta webhook payload (Cloud API format)
- Extract: from (phone number), message body, message type
- Only process `type === 'text'` messages
- Immediately return 200 OK to Meta (Meta retries if no 200 within 20s)
- Verify `X-Hub-Signature-256` header using `META_WEBHOOK_SECRET` (HMAC-SHA256 of raw body)
- If signature invalid: return 403, log the attempt
- Run keyword filter on message body
- If availability message: run Claude parser, upsert worker
- Always: log message to `messages` table
- If worker not found by phone: create minimal worker record with phone + parsed fields

### 2. `/lib/whatsapp/keyword-filter.ts`
```ts
function isAvailabilityMessage(text: string): boolean
```
Returns true if message contains ANY of:
- **availability keywords**: available, availability, avail, not available, unavailable, busy
- **day keywords**: monday, tuesday, wednesday, thursday, friday, saturday, sunday, mon, tue, wed, thu, fri, sat, sun, weekday, weekend
- **shift keywords**: day shift, night shift, afternoon, morning
- **time keywords**: full time, part time, fulltime, parttime
- **self-intro patterns**: "my name is", "i am", "i can work", "i'm available"

Case insensitive. Must match **at least 2 categories** to return true (reduces false positives).

### 3. `/lib/whatsapp/claude-parser.ts`
```ts
function parseAvailabilityMessage(phone: string, messageBody: string): Promise<ParsedWorkerData>
```
- Model: `claude-sonnet-4-20250514`, `max_tokens: 500`
- System prompt:
  ```
  You are a parser for a staffing agency. Extract worker information from WhatsApp messages.
  Return ONLY a JSON object with these fields (use null for anything not mentioned):
  {
    name: string | null,
    address: string | null,
    gender: 'male' | 'female' | null,
    shift: 'day' | 'afternoon' | 'night' | null,
    availability_type: 'full-time' | 'part-time' | null,
    available_days: string[] | null  (values must be: mon,tue,wed,thu,fri,sat,sun),
    notes: string | null
  }
  Do not include any explanation. Return only the JSON object.
  ```
- Handle JSON parse errors gracefully (return all nulls if parse fails)

### 4. `/lib/whatsapp/upsert-worker.ts`
```ts
function upsertWorker(phone: string, parsed: ParsedWorkerData): Promise<void>
```
- Use Supabase **SERVICE ROLE** key (bypasses RLS — runs server-side in webhook)
- If worker with phone exists: UPDATE only non-null fields from parsed data, update `updated_at`
- If not: INSERT new worker with phone + all non-null parsed fields, `status = 'active'`
- Log message to `messages` table with `is_availability_message = true`

### 5. `/lib/whatsapp/log-message.ts`
```ts
function logMessage(phone, body, direction, isAvailability, workerId?): Promise<void>
```
- Inserts into `messages` table
- Finds `worker_id` by phone if not provided

### 6. `/scripts/test-webhook.ts`
A script that sends fake Meta webhook payloads to `localhost:3000/api/whatsapp/incoming`.

Three test cases:
1. `"Hi my name is Sarah, I live in Mississauga, available full time, day shift"` — should trigger parser
2. `"monday wednesday friday available, part time, James from Brampton"` — should trigger parser
3. `"hey whats up"` — should NOT trigger parser

Include comment instructions on how to run it.

## Notes
- Use Supabase service role key for all server-side DB operations in this phase (not anon key)
