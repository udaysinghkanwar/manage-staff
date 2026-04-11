import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getJob } from '@/lib/jobs'
import { getCompanies } from '@/lib/companies'
import { JobDetail } from '@/components/jobs/job-detail'
import { buttonVariants } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

export default async function JobPage(props: PageProps<'/dashboard/jobs/[id]'>) {
  const { id } = await props.params

  let data
  try {
    data = await getJob(id)
  } catch {
    notFound()
  }

  const companies = await getCompanies()

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <Link
        href="/dashboard/jobs"
        className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'mb-4 -ml-2 gap-1')}
      >
        <ChevronLeft className="h-4 w-4" />
        Jobs
      </Link>
      <JobDetail data={data} companies={companies} />
    </div>
  )
}
