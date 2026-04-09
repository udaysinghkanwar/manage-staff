'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Briefcase, ShieldAlert, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { JobWithCount } from '@/lib/jobs'

type StatusFilter = 'all' | 'open' | 'filled' | 'cancelled'

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400',
  filled: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400',
  cancelled: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400',
}

export function JobList({ jobs }: { jobs: JobWithCount[] }) {
  const [status, setStatus] = useState<StatusFilter>('open')

  const filtered = jobs.filter((j) => status === 'all' || j.status === status)

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Briefcase className="h-10 w-10 text-muted-foreground mb-4" />
        <p className="text-lg font-medium">No jobs yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Create your first job posting.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        {(['open', 'all', 'filled', 'cancelled'] as StatusFilter[]).map((v) => (
          <Button
            key={v}
            variant={status === v ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatus(v)}
            className="min-h-[36px] capitalize"
          >
            {v}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No {status} jobs.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((job) => (
            <Link
              key={job.id}
              href={`/dashboard/jobs/${job.id}`}
              className="block rounded-xl border bg-card p-4 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-base truncate">{job.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5 truncate">{job.location}</p>
                </div>
                <Badge className={cn('shrink-0 capitalize', STATUS_STYLES[job.status])}>
                  {job.status}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-3">
                {job.shift && (
                  <Badge variant="secondary" className="capitalize">{job.shift}</Badge>
                )}
                {job.safety_shoes_required && (
                  <Badge variant="outline" className="gap-1">
                    <ShieldAlert className="h-3 w-3" />
                    Safety shoes
                  </Badge>
                )}
                <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" />
                  {job.assigned_count} assigned
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
