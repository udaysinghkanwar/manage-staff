import { Skeleton } from '@/components/ui/skeleton'

export default function JobsLoading() {
  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-4 w-12" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="space-y-3">
        <div className="flex gap-2">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-9 w-24" />)}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  )
}
