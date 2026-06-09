import { createClient } from '@supabase/supabase-js'
import type { ParsedWorkerData } from './claude-parser'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function upsertWorker(
  phone: string,
  parsed: ParsedWorkerData
): Promise<string | null> {
  const supabase = getServiceClient()

  const { data: existing } = await supabase
    .from('workers')
    .select('id')
    .eq('phone', phone)
    .single()

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

    if (Object.keys(updates).length > 0) {
      await supabase.from('workers').update(updates).eq('id', existing.id)
    }

    return existing.id
  } else {
    // INSERT — new worker from WhatsApp
    const { data } = await supabase
      .from('workers')
      .insert({
        phone,
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

    return data?.id ?? null
  }
}
