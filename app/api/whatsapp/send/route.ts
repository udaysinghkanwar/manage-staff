import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logMessage } from '@/lib/whatsapp/log-message'

const GRAPH_URL = `https://graph.facebook.com/v22.0/${process.env.META_PHONE_NUMBER_ID}/messages`

export async function POST(request: NextRequest) {
  // Allow internal server-to-server calls (from server actions / webhook handlers)
  // but block unauthenticated external requests
  const isInternalCall = request.headers.get('x-internal-secret') === process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!isInternalCall) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user && process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH !== 'true') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

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
        language: { code: 'en_US' },
        ...((templateParams as string[])?.length > 0 && {
          components: [
            {
              type: 'body',
              parameters: (templateParams as string[]).map((t: string) => ({
                type: 'text',
                text: t,
              })),
            },
          ],
        }),
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
    console.error('[whatsapp/send] Meta API error:', JSON.stringify(data, null, 2))
    return NextResponse.json({ success: false, error: data }, { status: res.status })
  }

  console.log('[whatsapp/send] Meta accepted:', JSON.stringify({ to, type, response: data }, null, 2))

  const messageId = data.messages?.[0]?.id ?? null
  const messageBody = type === 'template'
    ? `[template: ${templateName}]`
    : (text as string)

  await logMessage(to, messageBody, 'outbound', false)

  return NextResponse.json({ success: true, messageId })
}
