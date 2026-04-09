import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import { NewWorkerForm } from '@/components/workers/new-worker-form'
import { cn } from '@/lib/utils'

export default function NewWorkerPage() {
  return (
    <div className="p-4 md:p-6 max-w-xl mx-auto">
      <Link
        href="/dashboard/workers"
        className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'mb-4 -ml-2 gap-1')}
      >
        <ChevronLeft className="h-4 w-4" />
        Workers
      </Link>
      <h1 className="text-2xl font-semibold mb-6">Add Worker</h1>
      <NewWorkerForm />
    </div>
  )
}
