import { logMessage } from '@/lib/whatsapp/log-message'

const GRAPH_URL = `https://graph.facebook.com/v22.0/${process.env.META_PHONE_NUMBER_ID}/messages`

export type SendMessageInput =
  | { to: string; type: 'text'; text: string }
  | { to: string; type: 'template'; templateName: string; templateParams?: string[] }

export interface SendMessageResult {
  success: boolean
  messageId: string | null
  error?: unknown
}

export async function sendWhatsAppMessage(input: SendMessageInput): Promise<SendMessageResult> {
  const messageBody = input.type === 'text' ? input.text : `[template: ${input.templateName}]`

  if (!process.env.META_ACCESS_TOKEN || !process.env.META_PHONE_NUMBER_ID) {
    console.log('[whatsapp/send] META credentials not set, skipping send to', input.to)
    await logMessage(input.to, messageBody, 'outbound', false)
    return { success: true, messageId: 'dev-mock' }
  }

  const payload: Record<string, unknown> = input.type === 'template'
    ? {
        messaging_product: 'whatsapp',
        to: input.to,
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
        to: input.to,
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

  console.log('[whatsapp/send] Meta accepted:', JSON.stringify({ to: input.to, type: input.type, response: data }, null, 2))

  await logMessage(input.to, messageBody, 'outbound', false)

  return { success: true, messageId: data.messages?.[0]?.id ?? null }
}
