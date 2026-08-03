'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { sendWhatsAppMessage } from '@/lib/whatsapp/send'

export interface BroadcastResult {
  sent: number
  failed: string[]
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function broadcastJob(
  jobId: string,
  workerIds: string[]
): Promise<BroadcastResult> {
  const supabase = getServiceClient()

  // Fetch job
  const { data: job } = await supabase
    .from('jobs')
    .select('title, location, shift, description, job_type, job_date, companies(name, street_address, city, province)')
    .eq('id', jobId)
    .single()

  if (!job) return { sent: 0, failed: workerIds }

  // Fetch workers
  const { data: workers } = await supabase
    .from('workers')
    .select('id, name, phone')
    .in('id', workerIds)

  if (!workers?.length) return { sent: 0, failed: workerIds }

  const result: BroadcastResult = { sent: 0, failed: [] }

  type JobCompany = { name: string; street_address: string; city: string; province: string }
  const companiesRaw = job.companies as unknown
  const company: JobCompany | null = Array.isArray(companiesRaw) ? companiesRaw[0] ?? null : companiesRaw as JobCompany | null

  const jobDate = job.job_type === 'full-time'
    ? 'Full-time / Ongoing'
    : job.job_date
      ? new Date(job.job_date + 'T00:00:00').toLocaleDateString('en-CA', {
          weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
        })
      : 'TBD'
  const companyName = company?.name ?? job.location
  const companyAddress = company
    ? [company.street_address, company.city, company.province].filter(Boolean).join(', ')
    : job.location

  for (const worker of workers) {
    try {
      const send = await sendWhatsAppMessage({
        to: worker.phone,
        type: 'template',
        templateName: 'job_broadcast',
        templateParams: [
          worker.name,
          job.title,
          jobDate,
          companyName,
          companyAddress,
          job.shift ?? 'TBD',
          // Slot 7 is the safety-shoes line in the approved `job_broadcast`
          // template. The field is gone from the app, but Meta rejects a
          // param count that doesn't match the template, so we still fill it.
          // Drop this once {{7}} is removed from the template in Meta.
          'No',
          job.description ?? 'N/A',
        ],
      })

      if (send.success) {
        const { error: insertError } = await supabase
          .from('job_broadcasts')
          .insert({ job_id: jobId, worker_id: worker.id, response: 'pending' })
        if (insertError) {
          console.error('[broadcast] failed to insert job_broadcast:', insertError.message)
          result.failed.push(worker.name)
        } else {
          result.sent++
        }
      } else {
        result.failed.push(worker.name)
      }
    } catch {
      result.failed.push(worker.name)
    }
  }

  revalidatePath(`/dashboard/jobs/${jobId}`)
  return result
}
