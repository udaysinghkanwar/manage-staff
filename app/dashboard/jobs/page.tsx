import Link from 'next/link'
import { getJobs } from '@/lib/jobs'
import { JobList } from '@/components/jobs/job-list'
import { buttonVariants } from '@/components/ui/button'
import { PlusIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export default async function JobsPage() {
  const jobs = await getJobs()

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Jobs</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{jobs.length} total</p>
        </div>
        <Link href="/dashboard/jobs/new" className={cn(buttonVariants(), 'gap-2 min-h-[44px]')}>
          <PlusIcon className="h-4 w-4" />
          Create Job
        </Link>
      </div>
      <JobList jobs={jobs} />
    </div>
  )
}
