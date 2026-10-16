import { createClient } from '@supabase/supabase-js'
import type { ParsedWorkerData } from './claude-parser'
import type { WhatsAppContact } from './log-message'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export type UpsertResult =
  | { workerId: string; needsPhone: false }
  // A new sender with no phone number from Meta and none in their message:
  // a worker can't be created, because broadcasts go to a phone number.
  | { workerId: null; needsPhone: true }
  | { workerId: null; needsPhone: false }

export async function upsertWorker(
  contact: WhatsAppContact,
  parsed: ParsedWorkerData
): Promise<UpsertResult> {
  const supabase = getServiceClient()

  // Meta's number wins over one typed in the message.
  const phone = contact.phone ?? parsed.phone

  // Match on BSUID first: it identifies the WhatsApp account even when the
  // number is withheld. Fall back to phone, which also links an existing
  // worker who has since turned on a username.
  let existing: { id: string; bsuid: string | null } | null = null
  if (contact.bsuid) {
    const { data } = await supabase
      .from('workers').select('id, bsuid').eq('bsuid', contact.bsuid).maybeSingle()
    existing = data
  }
  if (!existing && phone) {
    const { data } = await supabase
      .from('workers').select('id, bsuid').eq('phone', phone).maybeSingle()
    existing = data
  }

  if (existing) {
    // UPDATE — only overwrite non-null parsed fields
    const updates: Record<string, unknown> = {}
    if (parsed.name)              updates.name = parsed.name
    if (parsed.city)              updates.city = parsed.city
    if (parsed.main_intersection) updates.main_intersection = parsed.main_intersection
    if (parsed.age)               updates.age = parsed.age
    if (parsed.gender)            updates.gender = parsed.gender
    if (parsed.shifts?.length)    updates.shifts = parsed.shifts
    if (parsed.availability_type) updates.availability_type = parsed.availability_type
    if (parsed.available_days)    updates.available_days = parsed.available_days
    if (parsed.notes)             updates.notes = parsed.notes
    if (contact.bsuid && !existing.bsuid) updates.bsuid = contact.bsuid

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase.from('workers').update(updates).eq('id', existing.id)
      if (error) console.error('[upsert-worker] update failed for', existing.id, '—', error.message)
    }

    return { workerId: existing.id, needsPhone: false }
  }

  if (!phone) return { workerId: null, needsPhone: true }

  // INSERT — new worker from WhatsApp
  const { data, error } = await supabase
    .from('workers')
    .insert({
      phone,
      bsuid: contact.bsuid,
      name: parsed.name ?? 'Unknown',
      city: parsed.city ?? null,
      main_intersection: parsed.main_intersection ?? null,
      age: parsed.age ?? null,
      gender: parsed.gender ?? null,
      shifts: parsed.shifts ?? null,
      availability_type: parsed.availability_type ?? null,
      available_days: parsed.available_days ?? null,
      notes: parsed.notes ?? null,
      status: 'active',
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error('[upsert-worker] insert failed —', error?.message)
    return { workerId: null, needsPhone: false }
  }
  return { workerId: data.id, needsPhone: false }
}
