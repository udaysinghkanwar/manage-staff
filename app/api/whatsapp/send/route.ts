import { NextResponse, type NextRequest } from 'next/server'
import { logMessage } from '@/lib/whatsapp/log-message'

const GRAPH_URL = `https://graph.facebook.com/v22.0/${process.env.META_PHONE_NUMBER_ID}/messages`

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { to, type, templateName, templateParams, text } = body

  if (!process.env.META_ACCESS_TOKEN || !process.env.META_PHONE_NUMBER_ID) {
    // Dev mode — skip actual send, return mock success
    console.log('[whatsapp/send] META credentials not set, skipping send to', to)
    await logMessage(to, text ?? `[template: ${templateName}]`, 'outbound', false)
    return NextResponse.json({ success: true, messageId: 'dev-mock', dev: true })
  }

  let payload: Record<string, unknown>

  if (type === 'template') {
    payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: 'en' },
        components: [
          {
            type: 'body',
            parameters: (templateParams as string[]).map((text: string) => ({
              type: 'text',
              text,
            })),
          },
        ],
      },
    }
  } else {
    payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text, preview_url: false },
    }
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
    console.error('[whatsapp/send] Meta API error:', data)
    return NextResponse.json({ success: false, error: data }, { status: res.status })
  }

  const messageId = data.messages?.[0]?.id ?? null
  const messageBody = type === 'template'
    ? `[template: ${templateName}]`
    : (text as string)

  await logMessage(to, messageBody, 'outbound', false)

  return NextResponse.json({ success: true, messageId })
}
