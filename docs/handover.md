# Session Handover — WhatsApp Pipeline Live

Snapshot of the manage-staff codebase as of the last session. Use this to onboard a fresh session without re-debugging the same things.

## TL;DR

The full WhatsApp pipeline is operational in production at `https://www.managestaff.ca`:
worker texts in → webhook fires → DB → realtime inbox → reply from dashboard works end-to-end. The only blockers remaining are Meta-side (template approval, business verification). No outstanding code bugs.

## Working in production

- **Auth** — email+password via Supabase. Public sign-ups disabled; users created manually in Supabase Studio.
- **WhatsApp inbound** — webhook `POST /api/whatsapp/incoming` receives real messages and status events. HMAC verified with `META_WEBHOOK_SECRET`.
- **WhatsApp outbound (free-form text)** — `sendReply`, `sendOnboarding`, `sendConfirmation` all work via direct calls to `sendWhatsAppMessage()` in [lib/whatsapp/send.ts](../lib/whatsapp/send.ts).
- **Auto-onboarding** — unknown sender → instruction text. Sender with availability details → Claude-parsed → upsert into `workers`.
- **Inbox UI** — [components/inbox/inbox-view.tsx](../components/inbox/inbox-view.tsx) — Supabase Realtime channel, optimistic sends, conversation list.
- **Dashboard CRUD** — workers, jobs, companies.
- **Status webhooks** — `sent` → `delivered` → `read` events log to console.
- **Landing page + waitlist** at `/`.

## Recent architectural change worth knowing about

Outbound used to be an internal HTTP hop: Server Action → `POST /api/whatsapp/send` → Meta. Vercel's Deployment Protection blocked that self-call on production deployment URLs, so replies silently failed.

Fixed by extracting the Meta send logic to a plain function — see [lib/whatsapp/send.ts](../lib/whatsapp/send.ts). All four callers now invoke it directly:
- [lib/inbox.ts](../lib/inbox.ts) `sendReply`
- [lib/whatsapp/broadcast.ts](../lib/whatsapp/broadcast.ts) `broadcastJob`
- [app/api/whatsapp/incoming/route.ts](../app/api/whatsapp/incoming/route.ts) `sendOnboarding`, `sendConfirmation`

`app/api/whatsapp/send/route.ts` and `lib/get-base-url.ts` were deleted as a result.

## Meta-side identifiers (for diagnostic API calls)

| Thing | ID |
|---|---|
| Business Portfolio | `1613023429955587` |
| WhatsApp Business Account (WABA) | `2396848454134371` |
| App | `1227627859168074` |
| Phone Number | `1103183086212734` (+1 289-769-3823, verified name "Manage Staff") |
| System User | `122112921380735094` ("Manage staff prod") |
| Two-step verification PIN | `202607` |

## Outstanding Meta-side actions

| Item | Status | Action |
|---|---|---|
| `worker_onboarding` template | `PENDING`, miscategorized as Marketing | Wait for approval; appeal category |
| `job_broadcast` template | `PENDING`, miscategorized as Marketing | Wait for approval; appeal category |
| Template category appeal | Yellow banner in WhatsApp Manager | Click "Review category updates in Business Support Home" → push both to Utility |
| Business verification | `not_verified` → capped at `TIER_250` | Business Settings → Business info → Start verification (1–5 day review) |
| `hello_world` template | APPROVED but unusable on this number | Ignore — only works on Meta's Public Test Numbers |

Diagnostic command — list current template states:
```bash
curl -s "https://graph.facebook.com/v22.0/2396848454134371/message_templates?fields=name,status,language,category" \
  -H "Authorization: Bearer $META_ACCESS_TOKEN"
```

## Outstanding code-side actions

- **Rotate the `META_ACCESS_TOKEN`** — the System User token was shared in chat. Regenerate in Business Settings → System Users → Manage staff prod → revoke + generate new → update Vercel env → redeploy.
- (Optional) When a known-but-not-onboarded number keeps messaging in without availability details, the onboarding text fires every single time. Could add a debounce or "I already sent you instructions" branch.

## Untested paths

- **Job broadcast end-to-end** — blocked on `job_broadcast` template approval. Once approved, click the broadcast button on a job page → confirm template fires to selected workers → reply YES/NO from a real phone → confirm the row in `job_broadcasts` updates.

## Critical Meta gotchas we hit (don't repeat them)

1. **WABA subscribed_apps** — a separate subscription layer from the app's webhook config. Without explicitly subscribing the app to the WABA via `POST /WABA_ID/subscribed_apps`, real messages silently drop even with a verified webhook URL and `messages` field toggled on. Not exposed in the UI.
2. **Verify and save is a no-op when the form is clean** — if the verify token didn't change, clicking the button doesn't re-fire the handshake. Force-dirty by retyping the token, or click Remove subscription and re-add.
3. **App must be Published** — unpublished apps only receive Test-button webhook payloads, never real production data. Even from app admins.
4. **Vercel Deployment Protection** blocks internal `fetch(`https://${VERCEL_URL}/...`)` calls because deployment URLs require auth. Custom domains don't. We sidestepped this entirely by removing the internal HTTP hop.
5. **Free-form text only works inside the 24-hour customer service window** — i.e. after the recipient messages your business number. Outside the window, only approved templates can be sent. This is why broadcasts must use templates.
6. **`/register` endpoint refuses `data_localization_region`** — deprecated in newer API versions. Drop the field and the call works.
7. **Inbound log timing** — `processMessage` now logs the inbound message *before* sending the outbound reply, so `created_at` puts them in the right order in the inbox UI. The earlier ordering bug was fixed in [app/api/whatsapp/incoming/route.ts](../app/api/whatsapp/incoming/route.ts).

## Tooling

- **Vercel MCP** is authenticated for this project. Available tools include `mcp__plugin_vercel_vercel__get_runtime_logs`, `list_deployments`, `get_project`. Use these instead of asking the user to paste log screenshots.
- Project ID: `prj_81V3ms5kWlrKncoZVtSeTgTsOvPW`
- Team ID: `team_hoqeT7G7jMspk2oAwhZeLigl`
- Useful runtime log queries: `query="whatsapp"`, `query="whatsapp/incoming"`, filter `level="error"`.

## How to verify the pipeline is alive (~30 seconds)

```bash
# 1. Outbound — should return wamid in JSON
curl -s "https://graph.facebook.com/v22.0/1103183086212734/messages" \
  -H "Authorization: Bearer $META_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"messaging_product":"whatsapp","to":"<recipient-in-24h-window>","type":"text","text":{"body":"ping"}}'

# 2. Inbound — text the business number from a real phone, then check Vercel logs
#    for: POST /api/whatsapp/incoming 200

# 3. Subscription health — should NOT be []
curl -s "https://graph.facebook.com/v22.0/2396848454134371/subscribed_apps" \
  -H "Authorization: Bearer $META_ACCESS_TOKEN"

# 4. WABA health — look for "LIMITED" or "BLOCKED" can_send_message
curl -s "https://graph.facebook.com/v22.0/2396848454134371?fields=status,health_status,account_review_status" \
  -H "Authorization: Bearer $META_ACCESS_TOKEN"
```
