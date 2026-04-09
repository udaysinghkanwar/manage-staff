import Link from 'next/link'
import { getWorkers } from '@/lib/workers'
import { WorkerList } from '@/components/workers/worker-list'
import { buttonVariants } from '@/components/ui/button'
import { UserPlus } from 'lucide-react'
import { cn } from '@/lib/utils'

export default async function WorkersPage() {
  const workers = await getWorkers()

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Workers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {workers.length} total
          </p>
        </div>
        <Link href="/dashboard/workers/new" className={cn(buttonVariants(), 'gap-2 min-h-[44px]')}>
          <UserPlus className="h-4 w-4" />
          Add Worker
        </Link>
      </div>

      <WorkerList workers={workers} />
    </div>
  )
}
