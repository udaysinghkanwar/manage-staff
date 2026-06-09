import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAvailabilityMessage } from "@/lib/whatsapp/keyword-filter";
import { sendWhatsAppMessage } from "@/lib/whatsapp/send";
import { parseAvailabilityMessage } from "@/lib/whatsapp/claude-parser";
import { upsertWorker } from "@/lib/whatsapp/upsert-worker";
import { logMessage } from "@/lib/whatsapp/log-message";

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
        const phone = msg.from;
        const body = msg.text?.body ?? "";
        await processMessage(phone, body);
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

async function processMessage(phone: string, body: string) {
  const supabase = getServiceClient();
  const normalized = body.trim().toLowerCase();

  // YES/NO detection — check before anything else
  if (YES_WORDS.has(normalized) || NO_WORDS.has(normalized)) {
    await handleJobResponse(phone, normalized, body);
    return;
  }

  // Check if this is a known worker
  const { data: worker } = await supabase
    .from("workers")
    .select("id")
    .eq("phone", phone)
    .maybeSingle();

  const isAvailability = isAvailabilityMessage(body);

  if (!worker) {
    if (isAvailability) {
      const parsed = await parseAvailabilityMessage(phone, body);
      const workerId = await upsertWorker(phone, parsed);
      await logMessage(phone, body, "inbound", true, workerId ?? undefined);
      await sendConfirmation(phone);
    } else {
      await logMessage(phone, body, "inbound", false);
      await sendOnboarding(phone);
    }
    return;
  }

  let workerId: string | null = null;
  if (isAvailability) {
    const parsed = await parseAvailabilityMessage(phone, body);
    workerId = await upsertWorker(phone, parsed);
  }
  await logMessage(
    phone,
    body,
    "inbound",
    isAvailability,
    workerId ?? undefined,
  );
  if (isAvailability) {
    await sendConfirmation(phone);
  }
}

async function sendOnboarding(phone: string) {
  try {
    await sendWhatsAppMessage({
      to: phone,
      type: "text",
      text: "Hi! Thanks for reaching out.\n\nTo register as a worker, please reply with your details:\n\nName: [full name]\nAge: [your age]\nCity: [city, province]\nShift: [day / afternoon / night]\nAvailability: [full-time / part-time]\nDays: [Mon Tue Wed...] (if part-time)\nGender: [male / female]\n\nExample:\nName: John Smith\nAge: 32\nCity: Toronto, ON\nShift: Day\nAvailability: Full-time\nGender: Male",
    });
  } catch (err) {
    console.error("[onboarding] failed to send to", phone, err);
  }
}

async function sendConfirmation(phone: string) {
  try {
    await sendWhatsAppMessage({
      to: phone,
      type: "text",
      text: "Your information has been received and processed. We will inform you as soon as a suitable job position is available for you. To make changes to your information, simply resend your updated details.",
    });
  } catch (err) {
    console.error("[confirmation] failed to send to", phone, err);
  }
}

async function handleJobResponse(
  phone: string,
  normalized: string,
  raw: string,
) {
  const supabase = getServiceClient();
  const response = YES_WORDS.has(normalized) ? "yes" : "no";

  // Find worker by phone
  const { data: worker } = await supabase
    .from("workers")
    .select("id")
    .eq("phone", phone)
    .single();

  if (worker) {
    // Find most recent pending broadcast for this worker
    const { data: broadcast } = await supabase
      .from("job_broadcasts")
      .select("id")
      .eq("worker_id", worker.id)
      .eq("response", "pending")
      .order("sent_at", { ascending: false })
      .limit(1)
      .single();

    if (broadcast) {
      await supabase
        .from("job_broadcasts")
        .update({ response, responded_at: new Date().toISOString() })
        .eq("id", broadcast.id);
    }
  }

  await logMessage(phone, raw, "inbound", false, worker?.id);
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface MetaWebhookPayload {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: Array<{
          type: string;
          from: string;
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
