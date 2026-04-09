import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function logMessage(
  phone: string,
  body: string,
  direction: 'inbound' | 'outbound',
  isAvailability: boolean,
  workerId?: string
): Promise<void> {
  const supabase = getServiceClient()

  let resolvedWorkerId = workerId ?? null

  if (!resolvedWorkerId) {
    const { data } = await supabase
      .from('workers')
      .select('id')
      .eq('phone', phone)
      .single()
    resolvedWorkerId = data?.id ?? null
  }

  await supabase.from('messages').insert({
    phone,
    body,
    direction,
    is_availability_message: isAvailability,
    worker_id: resolvedWorkerId,
  })
}
