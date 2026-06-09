'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { Job, JobType, ShiftType, DayOfWeek, Company } from '@/lib/types'
import type { WorkerWithAssignment } from '@/lib/workers'

export interface JobWithCount extends Job {
  assigned_count: number
}

export interface CreateJobData {
  title: string
  location: string
  job_type: JobType
  shift: ShiftType
  description?: string
  safety_shoes_required: boolean
  job_date?: string | null
  required_male?: number
  required_female?: number
  company_id?: string | null
}

export interface UpdateJobData extends Partial<Omit<CreateJobData, 'shift' | 'job_type'>> {
  job_type?: JobType
  shift?: ShiftType
  status?: 'open' | 'filled' | 'cancelled'
}

export interface MatchedWorker extends WorkerWithAssignment {
  location_match: boolean
  tier: 1 | 2 | 3 | 4
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
  company: Company | null
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

  const [{ data: assignedRaw }, matched, broadcasts, companyRes] = await Promise.all([
    supabase
      .from('job_assignments')
      .select('id, assigned_at, worker_id, workers(id, name, phone)')
      .eq('job_id', id)
      .order('assigned_at', { ascending: false }),
    getMatchedWorkers(id, job),
    getBroadcasts(id),
    job.company_id
      ? supabase.from('companies').select('*').eq('id', job.company_id).single()
      : Promise.resolve({ data: null }),
  ])

  const assigned = (assignedRaw ?? []).map((a) => ({
    assignment_id: a.id,
    assigned_at: a.assigned_at,
    worker: (Array.isArray(a.workers) ? a.workers[0] : a.workers) as {
      id: string; name: string; phone: string
    },
  }))

  return { job, company: (companyRes.data as Company | null) ?? null, matched, assigned, broadcasts }
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

  // Fetch company for city matching
  let companyCity = ''
  if (resolvedJob.company_id) {
    const { data: company } = await supabase
      .from('companies')
      .select('city')
      .eq('id', resolvedJob.company_id)
      .single()
    companyCity = company?.city?.toLowerCase() ?? ''
  }

  // Determine the job's day of week from job_date
  const DAY_MAP: DayOfWeek[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
  let jobDayOfWeek: DayOfWeek | null = null
  if (resolvedJob.job_date) {
    const d = new Date(resolvedJob.job_date + 'T00:00:00')
    jobDayOfWeek = DAY_MAP[d.getDay()]
  }

  // The date to check for assignment conflicts — use job_date if set, otherwise today
  const assignCheckDate = resolvedJob.job_date
    ?? new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })

  // Fetch all active workers with their assignments
  const { data: workers, error } = await supabase
    .from('workers')
    .select(`
      *,
      job_assignments (
        id,
        job_id,
        assigned_date,
        jobs ( status )
      )
    `)
    .eq('status', 'active')
    .order('name')

  if (error || !workers) return []

  const matched: MatchedWorker[] = []

  for (const w of workers) {
    // Filter: gender must match (if job requires male/female)
    if (resolvedJob.required_male > 0 && resolvedJob.required_female === 0 && w.gender !== 'male') continue
    if (resolvedJob.required_female > 0 && resolvedJob.required_male === 0 && w.gender !== 'female') continue

    // Filter: must not be permanently assigned (full-time) or assigned on the job's date
    const isAssigned = w.job_assignments?.some(
      (a: { assigned_date: string | null; jobs: { status: string } | null }) =>
        a.jobs?.status !== 'cancelled' && (a.assigned_date === null || a.assigned_date === assignCheckDate)
    )
    if (isAssigned) continue

    // Matching criteria
    const shiftMatch = !resolvedJob.shift || !w.shift || w.shift === resolvedJob.shift
    const cityMatch = !!companyCity && !!w.city && w.city.toLowerCase().includes(companyCity)
    const daysMatch = w.availability_type === 'full-time' ||
      !jobDayOfWeek ||
      !w.available_days?.length ||
      w.available_days.includes(jobDayOfWeek)
    const isFullTime = w.availability_type === 'full-time'

    // Tier ranking
    let tier: 1 | 2 | 3 | 4
    if (shiftMatch && cityMatch && daysMatch && isFullTime) {
      tier = 1
    } else if (shiftMatch && daysMatch && isFullTime) {
      tier = 2
    } else if (shiftMatch) {
      tier = 3
    } else {
      tier = 4
    }

    matched.push({
      ...w,
      job_assignments: undefined,
      is_assigned: false,
      assigned_job_id: null,
      assigned_job_title: null,
      location_match: cityMatch,
      tier,
    })
  }

  // Sort by tier first, then by name
  matched.sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier
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
      job_type: data.job_type,
      shift: data.shift,
      description: data.description?.trim() || null,
      safety_shoes_required: data.safety_shoes_required,
      job_date: data.job_type === 'on-call' ? (data.job_date ?? null) : null,
      required_male: data.required_male ?? 0,
      required_female: data.required_female ?? 0,
      company_id: data.company_id ?? null,
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
      ...(data.job_type !== undefined && { job_type: data.job_type }),
      ...(data.job_date !== undefined && { job_date: data.job_date ?? null }),
      ...(data.required_male !== undefined && { required_male: data.required_male }),
      ...(data.required_female !== undefined && { required_female: data.required_female }),
      ...(data.company_id !== undefined && { company_id: data.company_id }),
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

  // Full-time jobs → null assigned_date (permanent assignment)
  // On-call jobs → use job_date or today
  const { data: job } = await supabase
    .from('jobs')
    .select('job_type, job_date')
    .eq('id', jobId)
    .single()

  const assignedDate = job?.job_type === 'full-time'
    ? null
    : (job?.job_date ?? new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' }))

  const { error } = await supabase
    .from('job_assignments')
    .insert({ job_id: jobId, worker_id: workerId, assigned_date: assignedDate })

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
    .select('*, job_assignments(id, assigned_date, jobs(status))')
    .eq('status', 'active')
    .order('name')

  if (error) return []

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })

  return (data ?? []).filter((w) =>
    !w.job_assignments?.some(
      (a: { assigned_date: string; jobs: { status: string } | null }) =>
        a.assigned_date === today && a.jobs?.status !== 'cancelled'
    )
  ).map((w) => ({ id: w.id, name: w.name, phone: w.phone, shift: w.shift }))
}
