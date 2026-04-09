import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getWorker } from '@/lib/workers'
import { WorkerDetail } from '@/components/workers/worker-detail'
import { buttonVariants } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

export default async function WorkerPage(props: PageProps<'/dashboard/workers/[id]'>) {
  const { id } = await props.params

  let data
  try {
    data = await getWorker(id)
  } catch {
    notFound()
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <Link
        href="/dashboard/workers"
        className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'mb-4 -ml-2 gap-1')}
      >
        <ChevronLeft className="h-4 w-4" />
        Workers
      </Link>
      <WorkerDetail data={data} />
    </div>
  )
}
