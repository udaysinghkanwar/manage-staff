import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * Who a message is from or to. Senders with a WhatsApp username who haven't
 * interacted with the business in 30 days arrive with no phone number, only a
 * business-scoped user ID (BSUID), so either may be missing -- never both.
 */
export interface WhatsAppContact {
  phone: string | null
  bsuid: string | null
}

export async function logMessage(
  contact: WhatsAppContact,
  body: string,
  direction: 'inbound' | 'outbound',
  isAvailability: boolean,
  workerId?: string
): Promise<void> {
  const supabase = getServiceClient()

  let resolvedWorkerId = workerId ?? null

  if (!resolvedWorkerId) {
    const column = contact.phone ? 'phone' : 'bsuid'
    const value = contact.phone ?? contact.bsuid
    if (value) {
      const { data } = await supabase
        .from('workers')
        .select('id')
        .eq(column, value)
        .maybeSingle()
      resolvedWorkerId = data?.id ?? null
    }
  }

  const { error } = await supabase.from('messages').insert({
    phone: contact.phone,
    bsuid: contact.bsuid,
    body,
    direction,
    is_availability_message: isAvailability,
    worker_id: resolvedWorkerId,
  })

  // A failed insert means the message is missing from the inbox entirely, so
  // it must be visible in the logs rather than silently dropped.
  if (error) {
    console.error('[log-message] failed to record', direction, 'message:', error.message, {
      phone: contact.phone,
      bsuid: contact.bsuid,
    })
  }
}
