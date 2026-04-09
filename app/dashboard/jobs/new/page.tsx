import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import { NewJobForm } from '@/components/jobs/new-job-form'
import { cn } from '@/lib/utils'

export default function NewJobPage() {
  return (
    <div className="p-4 md:p-6 max-w-xl mx-auto">
      <Link
        href="/dashboard/jobs"
        className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'mb-4 -ml-2 gap-1')}
      >
        <ChevronLeft className="h-4 w-4" />
        Jobs
      </Link>
      <h1 className="text-2xl font-semibold mb-6">Create Job</h1>
      <NewJobForm />
    </div>
  )
}
