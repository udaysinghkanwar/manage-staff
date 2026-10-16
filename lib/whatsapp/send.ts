import { logMessage } from '@/lib/whatsapp/log-message'

const GRAPH_URL = `https://graph.facebook.com/v22.0/${process.env.META_PHONE_NUMBER_ID}/messages`

// Address by phone number (`to`) or, for senders who have a WhatsApp username
// and whose number Meta withheld, by business-scoped user ID (`recipient`).
// Meta uses the phone number when both are given.
type Address = { to?: string | null; recipient?: string | null }

export type SendMessageInput = Address &
  (
    | { type: 'text'; text: string }
    | { type: 'template'; templateName: string; templateParams?: string[] }
  )

export interface SendMessageResult {
  success: boolean
  messageId: string | null
  error?: unknown
}

export async function sendWhatsAppMessage(input: SendMessageInput): Promise<SendMessageResult> {
  const messageBody = input.type === 'text' ? input.text : `[template: ${input.templateName}]`
  const to = input.to || null
  const recipient = input.recipient || null

  if (!to && !recipient) {
    console.error('[whatsapp/send] no phone number or BSUID to send to; skipping')
    return { success: false, messageId: null, error: 'missing recipient' }
  }

  const address = to
    ? { to }
    : { recipient_type: 'individual', recipient }

  if (!process.env.META_ACCESS_TOKEN || !process.env.META_PHONE_NUMBER_ID) {
    console.log('[whatsapp/send] META credentials not set, skipping send to', to ?? recipient)
    await logMessage({ phone: to, bsuid: recipient }, messageBody, 'outbound', false)
    return { success: true, messageId: 'dev-mock' }
  }

  const payload: Record<string, unknown> = input.type === 'template'
    ? {
        messaging_product: 'whatsapp',
        ...address,
        type: 'template',
        template: {
          name: input.templateName,
          language: { code: 'en_US' },
          ...((input.templateParams?.length ?? 0) > 0 && {
            components: [
              {
                type: 'body',
                parameters: input.templateParams!.map((t) => ({ type: 'text', text: t })),
              },
            ],
          }),
        },
      }
    : {
        messaging_product: 'whatsapp',
        ...address,
        type: 'text',
        text: { body: input.text, preview_url: false },
      }

  const res = await fetch(GRAPH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.META_ACCESS_TOKEN}`,
    },
    body: JSON.stringify(payload),
  })

  const data = await res.json()

  if (!res.ok) {
    console.error('[whatsapp/send] Meta API error:', JSON.stringify(data, null, 2))
    return { success: false, messageId: null, error: data }
  }

  console.log('[whatsapp/send] Meta accepted:', JSON.stringify({ to, recipient, type: input.type, response: data }, null, 2))

  await logMessage({ phone: to, bsuid: recipient }, messageBody, 'outbound', false)

  return { success: true, messageId: data.messages?.[0]?.id ?? null }
}
