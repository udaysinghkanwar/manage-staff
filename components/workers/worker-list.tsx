'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WorkerWithAssignment } from '@/lib/workers'

type GenderFilter = 'all' | 'male' | 'female'
type ShiftFilter = 'all' | 'day' | 'afternoon' | 'night'
type AvailFilter = 'all' | 'full-time' | 'part-time'
type AssignFilter = 'all' | 'available' | 'assigned'

const DAY_LABELS: Record<string, string> = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu',
  fri: 'Fri', sat: 'Sat', sun: 'Sun',
}

function FilterButton({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button
      variant={active ? 'default' : 'outline'}
      size="sm"
      onClick={onClick}
      className="min-h-[36px]"
    >
      {children}
    </Button>
  )
}

export function WorkerList({ workers }: { workers: WorkerWithAssignment[] }) {
  const [gender, setGender] = useState<GenderFilter>('all')
  const [shift, setShift] = useState<ShiftFilter>('all')
  const [avail, setAvail] = useState<AvailFilter>('all')
  const [assign, setAssign] = useState<AssignFilter>('all')

  const filtered = workers.filter((w) => {
    if (gender !== 'all' && w.gender !== gender) return false
    if (shift !== 'all' && w.shift !== shift) return false
    if (avail !== 'all' && w.availability_type !== avail) return false
    if (assign === 'available' && w.is_assigned) return false
    if (assign === 'assigned' && !w.is_assigned) return false
    return true
  })

  if (workers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Users className="h-10 w-10 text-muted-foreground mb-4" />
        <p className="text-lg font-medium">No workers yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Add your first worker to get started.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground self-center w-16">Gender</span>
          {(['all', 'male', 'female'] as GenderFilter[]).map((v) => (
            <FilterButton key={v} active={gender === v} onClick={() => setGender(v)}>
              {v === 'all' ? 'All' : v.charAt(0).toUpperCase() + v.slice(1)}
            </FilterButton>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground self-center w-16">Shift</span>
          {(['all', 'day', 'afternoon', 'night'] as ShiftFilter[]).map((v) => (
            <FilterButton key={v} active={shift === v} onClick={() => setShift(v)}>
              {v === 'all' ? 'All' : v.charAt(0).toUpperCase() + v.slice(1)}
            </FilterButton>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground self-center w-16">Avail</span>
          {(['all', 'full-time', 'part-time'] as AvailFilter[]).map((v) => (
            <FilterButton key={v} active={avail === v} onClick={() => setAvail(v)}>
              {v === 'all' ? 'All' : v === 'full-time' ? 'Full-time' : 'Part-time'}
            </FilterButton>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground self-center w-16">Status</span>
          {(['all', 'available', 'assigned'] as AssignFilter[]).map((v) => (
            <FilterButton key={v} active={assign === v} onClick={() => setAssign(v)}>
              {v === 'all' ? 'All' : v.charAt(0).toUpperCase() + v.slice(1)}
            </FilterButton>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No workers match the selected filters.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((worker) => (
            <Link
              key={worker.id}
              href={`/dashboard/workers/${worker.id}`}
              className={cn(
                'block rounded-xl border bg-card p-4 transition-colors hover:bg-muted/50',
                worker.is_assigned && 'border-amber-300 dark:border-amber-700'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-base truncate">{worker.name}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{worker.phone}</p>
                </div>
                {worker.is_assigned && (
                  <Badge className="shrink-0 bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700">
                    Assigned
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5 mt-3">
                {worker.gender && (
                  <Badge variant="secondary" className="capitalize">{worker.gender}</Badge>
                )}
                {worker.shift && (
                  <Badge variant="secondary" className="capitalize">{worker.shift}</Badge>
                )}
                {worker.availability_type && (
                  <Badge variant="outline" className="capitalize">
                    {worker.availability_type}
                  </Badge>
                )}
              </div>

              {worker.availability_type === 'part-time' && worker.available_days?.length ? (
                <p className="text-xs text-muted-foreground mt-2">
                  {worker.available_days.map((d) => DAY_LABELS[d] ?? d).join(' · ')}
                </p>
              ) : null}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
