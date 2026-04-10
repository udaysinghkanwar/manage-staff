import { Skeleton } from '@/components/ui/skeleton'

export default function InboxLoading() {
  return (
    <div className="flex h-screen">
      <div className="w-full md:w-72 border-r border-border">
        <div className="px-4 py-4 border-b border-border space-y-2">
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-3 w-24" />
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="px-4 py-3 border-b border-border space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-12" />
            </div>
            <Skeleton className="h-3 w-40" />
          </div>
        ))}
      </div>
    </div>
  )
}
