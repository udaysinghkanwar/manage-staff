'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import type { Worker, DayOfWeek, ShiftType, AvailabilityType, WorkerGender } from '@/lib/types'

// Map Postgres unique constraint names → { field, message }
// Add a new entry here whenever a new unique constraint is added to the workers table.
const WORKER_UNIQUE_CONSTRAINTS: Record<string, { field: string; message: string }> = {
  workers_phone_key: { field: 'phone', message: 'A worker with this phone number already exists.' },
}

export interface WorkerWithAssignment extends Worker {
  is_assigned: boolean
  assigned_job_id: string | null
  assigned_job_title: string | null
}

export interface CreateWorkerData {
  name: string
  phone: string
  city?: string
  main_intersection?: string
  age?: number | null
  gender?: WorkerGender
  shifts?: ShiftType[]
  availability_type?: AvailabilityType
  available_days?: DayOfWeek[]
  notes?: string
}

export interface UpdateWorkerData extends Partial<CreateWorkerData> {
  status?: 'active' | 'inactive'
}

export interface WorkerHistory {
  worker: Worker
  assignments: Array<{
    id: string
    assigned_at: string
    assigned_date: string | null
    job: { id: string; title: string; location: string; shift: string | null; status: string }
  }>
  broadcasts: Array<{
    id: string
    response: string
    sent_at: string
    responded_at: string | null
    job: { id: string; title: string; location: string }
  }>
}

export async function getWorkers(): Promise<WorkerWithAssignment[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('workers')
    .select(`
      *,
      job_assignments (
        id,
        job_id,
        assigned_date,
        jobs ( id, title, status )
      )
    `)
    .order('name')

  if (error) throw new Error(error.message)

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })

  return (data ?? []).map((w) => {
    const activeAssignment = w.job_assignments?.find(
      (a: { assigned_date: string | null; jobs: { status: string } | null }) =>
        a.jobs?.status !== 'cancelled' && (a.assigned_date === null || a.assigned_date === today)
    )
    return {
      ...w,
      job_assignments: undefined,
      is_assigned: !!activeAssignment,
      assigned_job_id: activeAssignment?.job_id ?? null,
      assigned_job_title: activeAssignment?.jobs?.title ?? null,
    }
  })
}

export async function getWorker(id: string): Promise<WorkerHistory> {
  const supabase = await createClient()

  const { data: worker, error: wErr } = await supabase
    .from('workers')
    .select('*')
    .eq('id', id)
    .single()

  if (wErr || !worker) throw new Error(wErr?.message ?? 'Worker not found')

  const { data: assignments } = await supabase
    .from('job_assignments')
    .select('id, assigned_at, assigned_date, job_id, jobs ( id, title, location, shift, status )')
    .eq('worker_id', id)
    .order('assigned_at', { ascending: false })

  const { data: broadcasts } = await supabase
    .from('job_broadcasts')
    .select('id, response, sent_at, responded_at, job_id, jobs ( id, title, location )')
    .eq('worker_id', id)
    .order('sent_at', { ascending: false })

  return {
    worker,
    assignments: (assignments ?? []).map((a) => ({
      id: a.id,
      assigned_at: a.assigned_at,
      assigned_date: a.assigned_date,
      job: (Array.isArray(a.jobs) ? a.jobs[0] : a.jobs) as { id: string; title: string; location: string; shift: string | null; status: string },
    })),
    broadcasts: (broadcasts ?? []).map((b) => ({
      id: b.id,
      response: b.response,
      sent_at: b.sent_at,
      responded_at: b.responded_at,
      job: (Array.isArray(b.jobs) ? b.jobs[0] : b.jobs) as { id: string; title: string; location: string },
    })),
  }
}

export async function createWorker(data: CreateWorkerData) {
  const supabase = await createClient()

  const { error } = await supabase.from('workers').insert({
    name: data.name.trim(),
    phone: data.phone.trim(),
    city: data.city?.trim() || null,
    main_intersection: data.main_intersection?.trim() || null,
    age: data.age ?? null,
    gender: data.gender ?? null,
    shifts: data.shifts?.length ? data.shifts : null,
    availability_type: data.availability_type ?? null,
    available_days: data.availability_type === 'part-time' ? (data.available_days ?? null) : null,
    notes: data.notes?.trim() || null,
    status: 'active',
  })

  if (error) {
    if (error.code === '23505') {
      const match = Object.entries(WORKER_UNIQUE_CONSTRAINTS).find(([key]) =>
        error.message.includes(key)
      )
      if (match) return { error: match[1].message, field: match[1].field }
    }
    return { error: error.message, field: undefined }
  }
  redirect('/dashboard/workers?created=1')
}

export async function updateWorker(id: string, data: UpdateWorkerData) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('workers')
    .update({
      ...(data.name !== undefined && { name: data.name.trim() }),
      ...(data.phone !== undefined && { phone: data.phone.trim() }),
      ...(data.city !== undefined && { city: data.city?.trim() || null }),
      ...(data.main_intersection !== undefined && {
        main_intersection: data.main_intersection?.trim() || null,
      }),
      ...(data.age !== undefined && { age: data.age }),
      ...(data.gender !== undefined && { gender: data.gender }),
      ...(data.shifts !== undefined && {
        shifts: data.shifts && data.shifts.length > 0 ? data.shifts : null,
      }),
      ...(data.availability_type !== undefined && { availability_type: data.availability_type }),
      ...(data.available_days !== undefined && {
        available_days: data.availability_type === 'part-time' ? data.available_days : null,
      }),
      ...(data.notes !== undefined && { notes: data.notes?.trim() || null }),
      ...(data.status !== undefined && { status: data.status }),
    })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/workers')
  return { error: null }
}

export async function deactivateWorker(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('workers')
    .update({ status: 'inactive' })
    .eq('id', id)

  if (error) return { error: error.message }
  redirect('/dashboard/workers')
}

export async function reactivateWorker(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('workers')
    .update({ status: 'active' })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath(`/dashboard/workers/${id}`)
  revalidatePath('/dashboard/workers')
  return { error: null }
}
