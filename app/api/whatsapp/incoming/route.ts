import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAvailabilityMessage } from "@/lib/whatsapp/keyword-filter";
import { sendWhatsAppMessage } from "@/lib/whatsapp/send";
import { parseAvailabilityMessage } from "@/lib/whatsapp/claude-parser";
import { upsertWorker } from "@/lib/whatsapp/upsert-worker";
import { logMessage, type WhatsAppContact } from "@/lib/whatsapp/log-message";

const YES_WORDS = new Set(["yes", "yeah", "y"]);
const NO_WORDS = new Set(["no", "nope", "n"]);

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// ─── GET: Meta webhook verification ─────────────────────────────────────────

export function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return new Response(challenge ?? "", { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

// ─── POST: Incoming messages ─────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Read raw body for HMAC verification
  const rawBody = await request.text();

  // Always return 200 quickly — Meta will retry if we don't
  const response = NextResponse.json({ status: "ok" }, { status: 200 });

  // Signature verification.
  // In dev (DEV_BYPASS_AUTH=true) we allow unsigned requests for testing.
  // In production the secret must be set — missing secret = reject.
  const secret = process.env.META_WEBHOOK_SECRET;
  const isDev = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true";

  if (!secret) {
    if (!isDev) {
      console.error(
        "[webhook] META_WEBHOOK_SECRET not set — rejecting request",
      );
      return new Response("Forbidden", { status: 403 });
    }
    // dev with no secret: allow through with a warning
    console.warn("[webhook] skipping signature check (dev mode)");
  } else {
    const signature = request.headers.get("x-hub-signature-256") ?? "";
    const expected =
      "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
    const sigBuffer = Buffer.from(signature);
    const expBuffer = Buffer.from(expected);

    if (
      sigBuffer.length !== expBuffer.length ||
      !timingSafeEqual(sigBuffer, expBuffer)
    ) {
      console.warn(
        "[webhook] invalid signature from",
        request.headers.get("x-forwarded-for"),
      );
      return new Response("Forbidden", { status: 403 });
    }
  }

  // Parse Meta Cloud API payload
  let payload: MetaWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return response;
  }

  // Process each message entry
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const messages = change.value?.messages ?? [];
      for (const msg of messages) {
        if (msg.type !== "text") continue;
        // A sender with a WhatsApp username who hasn't interacted with us in
        // 30 days arrives without `from` (their number); `from_user_id` (the
        // business-scoped user ID) is always present.
        const contact: WhatsAppContact = {
          phone: msg.from || null,
          bsuid: msg.from_user_id || null,
        };
        if (!contact.phone && !contact.bsuid) {
          console.error(
            "[webhook] message with no sender identifier — skipping:",
            JSON.stringify(msg),
          );
          continue;
        }
        const body = msg.text?.body ?? "";
        await processMessage(contact, body);
      }

      // Delivery / read / failed status updates for outbound messages
      const statuses = change.value?.statuses ?? [];
      for (const s of statuses) {
        if (s.status === "failed") {
          console.error(
            "[webhook/status] FAILED:",
            JSON.stringify(
              {
                wamid: s.id,
                recipient: s.recipient_id,
                errors: s.errors,
              },
              null,
              2,
            ),
          );
        } else {
          console.log(
            "[webhook/status]",
            s.status,
            "→",
            s.recipient_id,
            "(" + s.id + ")",
          );
        }
      }
    }
  }

  return response;
}

// ─── Processing pipeline ─────────────────────────────────────────────────────

const ONBOARDING_TEXT =
  "Hi! Thanks for reaching out.\n\nTo register as a worker, please reply with your details:\n\nName: [full name]\nAge: [your age]\nCity: [city, province]\nMain intersection: [nearest major intersection]\nShifts: [day / afternoon / night — list all you're available for]\nAvailability: [full-time / part-time]\nDays: [Mon Tue Wed...] (if part-time)\nGender: [male / female]\n\nExample:\nName: John Smith\nAge: 32\nCity: Brampton, ON\nMain intersection: Bramalea and Queen St\nShifts: Day, Afternoon\nAvailability: Full-time\nGender: Male";

// Senders with a WhatsApp username may not share their number with us, and a
// worker record needs one, so they're asked for it up front.
const ONBOARDING_TEXT_WITH_PHONE = ONBOARDING_TEXT
  .replace("Name: [full name]\n", "Name: [full name]\nPhone: [your phone number]\n")
  .replace("Name: John Smith\n", "Name: John Smith\nPhone: (416) 555-0002\n");

const CONFIRMATION_TEXT =
  "Your information has been received and processed. We will inform you as soon as a suitable job position is available for you. To make changes to your information, simply resend your updated details.";

const ALREADY_REGISTERED_TEXT =
  "You're already registered. We'll message you when a matching job comes up. To update your details, just send them again.";

const NEED_PHONE_TEXT =
  "Thanks! We couldn't see your phone number because your WhatsApp uses a username. Please send your details again with your number included, e.g.\n\nPhone: (416) 555-0002";

// Registered workers often chat with staff; only greet them when nothing has
// been sent to them recently, so an ongoing conversation isn't interrupted.
const ALREADY_REGISTERED_COOLDOWN_MS = 24 * 60 * 60 * 1000;

async function findWorker(
  contact: WhatsAppContact,
): Promise<{ id: string } | null> {
  const supabase = getServiceClient();

  if (contact.bsuid) {
    const { data } = await supabase
      .from("workers")
      .select("id")
      .eq("bsuid", contact.bsuid)
      .maybeSingle();
    if (data) return data;
  }

  if (contact.phone) {
    const { data } = await supabase
      .from("workers")
      .select("id, bsuid")
      .eq("phone", contact.phone)
      .maybeSingle();
    if (data) {
      // Remember the BSUID so this worker is still recognised if they turn
      // on a username and Meta stops sending their number.
      if (contact.bsuid && !data.bsuid) {
        const { error } = await supabase
          .from("workers")
          .update({ bsuid: contact.bsuid })
          .eq("id", data.id);
        if (error) {
          console.error("[webhook] failed to link BSUID to worker", data.id, "—", error.message);
        }
      }
      return { id: data.id };
    }
  }

  return null;
}

async function sentRecently(contact: WhatsAppContact): Promise<boolean> {
  const supabase = getServiceClient();
  const since = new Date(Date.now() - ALREADY_REGISTERED_COOLDOWN_MS).toISOString();
  const column = contact.phone ? "phone" : "bsuid";
  const { count } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq(column, contact.phone ?? contact.bsuid)
    .eq("direction", "outbound")
    .gte("created_at", since);
  return (count ?? 0) > 0;
}

async function processMessage(contact: WhatsAppContact, body: string) {
  const normalized = body.trim().toLowerCase();

  // YES/NO detection — check before anything else
  if (YES_WORDS.has(normalized) || NO_WORDS.has(normalized)) {
    await handleJobResponse(contact, normalized, body);
    return;
  }

  const worker = await findWorker(contact);
  const isAvailability = isAvailabilityMessage(body);

  if (isAvailability) {
    const parsed = await parseAvailabilityMessage(contact.phone ?? contact.bsuid ?? "", body);
    const result = await upsertWorker(contact, parsed);
    await logMessage(contact, body, "inbound", true, result.workerId ?? undefined);
    if (result.workerId) {
      await reply(contact, CONFIRMATION_TEXT, "confirmation");
    } else if (result.needsPhone) {
      await reply(contact, NEED_PHONE_TEXT, "need-phone");
    }
    return;
  }

  await logMessage(contact, body, "inbound", false, worker?.id);

  if (!worker) {
    await reply(
      contact,
      contact.phone ? ONBOARDING_TEXT : ONBOARDING_TEXT_WITH_PHONE,
      "onboarding",
    );
  } else if (!(await sentRecently(contact))) {
    await reply(contact, ALREADY_REGISTERED_TEXT, "already-registered");
  }
}

async function reply(contact: WhatsAppContact, text: string, label: string) {
  try {
    const result = await sendWhatsAppMessage({
      to: contact.phone,
      recipient: contact.bsuid,
      type: "text",
      text,
    });
    if (!result.success) {
      console.error(`[${label}] send failed for`, contact.phone ?? contact.bsuid);
    }
  } catch (err) {
    console.error(`[${label}] failed to send to`, contact.phone ?? contact.bsuid, err);
  }
}

async function handleJobResponse(
  contact: WhatsAppContact,
  normalized: string,
  raw: string,
) {
  const supabase = getServiceClient();
  const response = YES_WORDS.has(normalized) ? "yes" : "no";

  const worker = await findWorker(contact);

  if (worker) {
    // Find most recent pending broadcast for this worker
    const { data: broadcast } = await supabase
      .from("job_broadcasts")
      .select("id")
      .eq("worker_id", worker.id)
      .eq("response", "pending")
      .order("sent_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (broadcast) {
      await supabase
        .from("job_broadcasts")
        .update({ response, responded_at: new Date().toISOString() })
        .eq("id", broadcast.id);
    }
  }

  await logMessage(contact, raw, "inbound", false, worker?.id);
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface MetaWebhookPayload {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: Array<{
          type: string;
          /** Phone number; omitted for username users we haven't talked to in 30 days. */
          from?: string;
          /** Business-scoped user ID; always present. */
          from_user_id?: string;
          text?: { body: string };
        }>;
        statuses?: Array<{
          id: string; // wamid
          recipient_id: string; // phone number
          status: "sent" | "delivered" | "read" | "failed";
          timestamp?: string;
          errors?: Array<{
            code: number;
            title: string;
            message?: string;
            error_data?: { details?: string };
          }>;
        }>;
      };
    }>;
  }>;
}
