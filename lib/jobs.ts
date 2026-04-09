'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { Job, ShiftType, DayOfWeek } from '@/lib/types'
import type { WorkerWithAssignment } from '@/lib/workers'

export interface JobWithCount extends Job {
  assigned_count: number
}

export interface CreateJobData {
  title: string
  location: string
  shift: ShiftType
  description?: string
  safety_shoes_required: boolean
  required_days?: DayOfWeek[]
}

export interface UpdateJobData extends Partial<Omit<CreateJobData, 'shift'>> {
  shift?: ShiftType
  status?: 'open' | 'filled' | 'cancelled'
}

export interface MatchedWorker extends WorkerWithAssignment {
  location_match: boolean
}

export interface BroadcastRow {
  id: string
  worker_id: string
  response: 'pending' | 'yes' | 'no'
  sent_at: string
  responded_at: string | null
  worker: { id: string; name: string; phone: string }
}

export interface JobDetail {
  job: Job
  matched: MatchedWorker[]
  assigned: Array<{
    assignment_id: string
    assigned_at: string
    worker: { id: string; name: string; phone: string }
  }>
  broadcasts: BroadcastRow[]
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getJobs(): Promise<JobWithCount[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('jobs')
    .select('*, job_assignments(id)')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (data ?? []).map((j) => ({
    ...j,
    job_assignments: undefined,
    assigned_count: (j.job_assignments ?? []).length,
  }))
}

export async function getJob(id: string): Promise<JobDetail> {
  const supabase = await createClient()

  const { data: job, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !job) throw new Error(error?.message ?? 'Job not found')

  const [{ data: assignedRaw }, matched, broadcasts] = await Promise.all([
    supabase
      .from('job_assignments')
      .select('id, assigned_at, worker_id, workers(id, name, phone)')
      .eq('job_id', id)
      .order('assigned_at', { ascending: false }),
    getMatchedWorkers(id, job),
    getBroadcasts(id),
  ])

  const assigned = (assignedRaw ?? []).map((a) => ({
    assignment_id: a.id,
    assigned_at: a.assigned_at,
    worker: (Array.isArray(a.workers) ? a.workers[0] : a.workers) as {
      id: string; name: string; phone: string
    },
  }))

  return { job, matched, assigned, broadcasts }
}

export async function getBroadcasts(jobId: string): Promise<BroadcastRow[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('job_broadcasts')
    .select('id, worker_id, response, sent_at, responded_at, workers(id, name, phone)')
    .eq('job_id', jobId)
    .order('sent_at', { ascending: false })

  return (data ?? []).map((b) => ({
    id: b.id,
    worker_id: b.worker_id,
    response: b.response,
    sent_at: b.sent_at,
    responded_at: b.responded_at,
    worker: (Array.isArray(b.workers) ? b.workers[0] : b.workers) as {
      id: string; name: string; phone: string
    },
  }))
}

export async function getMatchedWorkers(
  jobId: string,
  job?: Job
): Promise<MatchedWorker[]> {
  const supabase = await createClient()

  // Fetch job if not provided
  if (!job) {
    const { data } = await supabase.from('jobs').select('*').eq('id', jobId).single()
    if (!data) return []
    job = data as Job
  }

  const resolvedJob = job

  // Fetch all active workers with their open job assignments
  const { data: workers, error } = await supabase
    .from('workers')
    .select(`
      *,
      job_assignments (
        id,
        job_id,
        jobs ( id, status )
      )
    `)
    .eq('status', 'active')
    .order('name')

  if (error || !workers) return []

  const jobLocation = resolvedJob.location.toLowerCase()

  const matched: MatchedWorker[] = []

  for (const w of workers) {
    // Rule 2: must not be assigned to another open job
    const isAssigned = w.job_assignments?.some(
      (a: { jobs: { status: string } | null }) => a.jobs?.status === 'open'
    )

    // Rule 3: shift must match (workers with no shift set are treated as flexible)
    if (resolvedJob.shift && w.shift && w.shift !== resolvedJob.shift) continue

    // Rule 4: if job has required_days and worker is part-time,
    // worker's available_days must overlap with job's required_days
    if (
      resolvedJob.required_days?.length &&
      w.availability_type === 'part-time' &&
      w.available_days?.length
    ) {
      const hasOverlap = resolvedJob.required_days.some((d: DayOfWeek) =>
        w.available_days!.includes(d)
      )
      if (!hasOverlap) continue
    }

    const locationMatch = !!w.address &&
      w.address.toLowerCase().includes(jobLocation)

    matched.push({
      ...w,
      job_assignments: undefined,
      is_assigned: !!isAssigned,
      assigned_job_id: null,
      assigned_job_title: null,
      location_match: locationMatch,
    })
  }

  // Sort: location match first, then by name
  matched.sort((a, b) => {
    if (a.location_match !== b.location_match) return a.location_match ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  return matched
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createJob(data: CreateJobData) {
  const supabase = await createClient()

  const { data: job, error } = await supabase
    .from('jobs')
    .insert({
      title: data.title.trim(),
      location: data.location.trim(),
      shift: data.shift,
      description: data.description?.trim() || null,
      safety_shoes_required: data.safety_shoes_required,
      required_days: data.required_days?.length ? data.required_days : null,
      status: 'open',
    })
    .select('id')
    .single()

  if (error) return { error: error.message }
  redirect(`/dashboard/jobs/${job.id}`)
}

export async function updateJob(id: string, data: UpdateJobData) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('jobs')
    .update({
      ...(data.title !== undefined && { title: data.title!.trim() }),
      ...(data.location !== undefined && { location: data.location!.trim() }),
      ...(data.shift !== undefined && { shift: data.shift }),
      ...(data.description !== undefined && { description: data.description?.trim() || null }),
      ...(data.safety_shoes_required !== undefined && { safety_shoes_required: data.safety_shoes_required }),
      ...(data.required_days !== undefined && { required_days: data.required_days?.length ? data.required_days : null }),
      ...(data.status !== undefined && { status: data.status }),
    })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath(`/dashboard/jobs/${id}`)
  revalidatePath('/dashboard/jobs')
  return { error: null }
}

export async function assignWorker(jobId: string, workerId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('job_assignments')
    .insert({ job_id: jobId, worker_id: workerId })

  if (error) return { error: error.message }
  revalidatePath(`/dashboard/jobs/${jobId}`)
  return { error: null }
}

export async function unassignWorker(jobId: string, workerId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('job_assignments')
    .delete()
    .eq('job_id', jobId)
    .eq('worker_id', workerId)

  if (error) return { error: error.message }
  revalidatePath(`/dashboard/jobs/${jobId}`)
  return { error: null }
}

// Fetch all active, unassigned workers for the "Assign directly" modal
export async function getAvailableWorkers() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('workers')
    .select('*, job_assignments(id, jobs(status))')
    .eq('status', 'active')
    .order('name')

  if (error) return []

  return (data ?? []).filter((w) =>
    !w.job_assignments?.some(
      (a: { jobs: { status: string } | null }) => a.jobs?.status === 'open'
    )
  ).map((w) => ({ id: w.id, name: w.name, phone: w.phone, shift: w.shift }))
}
