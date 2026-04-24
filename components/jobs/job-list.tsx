'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { FilterDropdown } from '@/components/ui/filter-dropdown'
import { Button, buttonVariants } from '@/components/ui/button'
import { Briefcase, Search, Plus, ShieldAlert, Users, CalendarDays, X, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { JobWithCount } from '@/lib/jobs'

type StatusFilter = 'all' | 'open' | 'filled' | 'cancelled'
type ShiftFilter  = 'all' | 'day' | 'afternoon' | 'night'

const STATUS_STYLES: Record<string, string> = {
  open:      'border-emerald-600/60 text-emerald-400',
  filled:    'border-sky-600/60 text-sky-400',
  cancelled: 'border-red-600/60 text-red-400',
}

function Chip({
  active, children, onClick,
}: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center text-xs font-medium px-3 py-1.5 rounded-full border transition-colors',
        active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-transparent text-muted-foreground border-border hover:border-muted-foreground'
      )}
    >
      {children}
    </button>
  )
}

export function JobList({ jobs }: { jobs: JobWithCount[] }) {
  const [search, setSearch]     = useState('')
  const [status, setStatus]     = useState<StatusFilter>('open')
  const [shift, setShift]       = useState<ShiftFilter>('all')
  const [location, setLocation] = useState('all')
  const [date, setDate]         = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const isFiltered = status !== 'open' || shift !== 'all' || location !== 'all' || date !== null
  const activeFilterCount = [shift, location].filter(v => v !== 'all').length + (date ? 1 : 0)

  function resetFilters() {
    setStatus('open'); setShift('all')
    setLocation('all'); setDate(null)
  }

  const locations = useMemo(() => {
    const cities = new Set<string>()
    for (const j of jobs) {
      const city = j.location.split(',')[0].trim()
      if (city) cities.add(city)
    }
    return Array.from(cities).sort()
  }, [jobs])

  const filtered = jobs.filter((j) => {
    if (search) {
      const q = search.toLowerCase()
      if (!j.title.toLowerCase().includes(q) && !j.location.toLowerCase().includes(q)) return false
    }
    if (status !== 'all' && j.status !== status) return false
    if (shift !== 'all' && j.shift !== shift) return false
    if (location !== 'all' && !j.location.toLowerCase().includes(location.toLowerCase())) return false
    if (date && j.job_date !== date) return false
    return true
  })

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col gap-3 px-4 md:px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Jobs</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{jobs.length} total</p>
          </div>
          <Link
            href="/dashboard/jobs/new"
            className={cn(buttonVariants({ size: 'sm' }), 'gap-1.5 h-8 shrink-0')}
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Create Job</span>
            <span className="sm:hidden">Create</span>
          </Link>
        </div>

        {/* Search + filter icon (mobile) */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search jobs…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 w-full text-sm"
            />
          </div>
          <button
            onClick={() => setShowFilters(true)}
            className={cn(
              'md:hidden flex items-center justify-center h-9 w-9 rounded-lg border border-input shrink-0 transition-colors',
              isFiltered ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Status chips — mobile only */}
      <div className="md:hidden flex items-center gap-2 px-4 py-3 border-b border-border overflow-x-auto">
        <span className="text-xs font-medium text-muted-foreground shrink-0">Status</span>
        <Chip active={status === 'open'} onClick={() => setStatus('open')}>Open</Chip>
        <Chip active={status === 'all'} onClick={() => setStatus('all')}>All</Chip>
        <Chip active={status === 'filled'} onClick={() => setStatus('filled')}>Filled</Chip>
        <Chip active={status === 'cancelled'} onClick={() => setStatus('cancelled')}>Cancelled</Chip>
      </div>

      {/* Filter strip — desktop only */}
      <div className="hidden md:flex items-end gap-4 px-6 py-4 border-b border-border flex-wrap min-h-[72px]">
        <span className="text-xs font-medium text-muted-foreground mb-1 shrink-0">Filters</span>

        <FilterDropdown label="Status" value={status}
          onValueChange={(v) => setStatus(v as StatusFilter)}
          options={[
            { value: 'open', label: 'Open' },
            { value: 'all', label: 'All' },
            { value: 'filled', label: 'Filled' },
            { value: 'cancelled', label: 'Cancelled' },
          ]}
        />

        <FilterDropdown label="Shift" value={shift}
          onValueChange={(v) => setShift(v as ShiftFilter)}
          options={[
            { value: 'all', label: 'All' },
            { value: 'day', label: 'Day' },
            { value: 'afternoon', label: 'Afternoon' },
            { value: 'night', label: 'Night' },
          ]}
        />

        {locations.length > 0 && (
          <FilterDropdown label="Location" value={location}
            onValueChange={setLocation}
            options={[
              { value: 'all', label: 'All' },
              ...locations.map((l) => ({ value: l, label: l })),
            ]}
          />
        )}

        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Date</span>
          <div className="flex items-center gap-1">
            <DatePicker value={date} onChange={setDate} placeholder="Any date"
              className="h-7 text-xs min-w-[130px]" />
            {date && (
              <button onClick={() => setDate(null)}
                className="text-xs text-muted-foreground hover:text-foreground px-1">
                ✕
              </button>
            )}
          </div>
        </div>

        {isFiltered && (
          <div className="flex flex-col gap-1">
            <span className="text-xs text-transparent select-none">&middot;</span>
            <button
              onClick={resetFilters}
              className="flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent border border-transparent hover:border-border transition-colors"
            >
              <X className="h-3 w-3" />
              Reset
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-6">
        {jobs.length === 0 ? (
          <Empty
            icon={<Briefcase className="h-8 w-8" />}
            title="No jobs yet"
            description="Create your first job posting."
          />
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">
            No jobs match the selected filters.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>

      {/* Filter bottom sheet — mobile only */}
      {showFilters && (
        <div className="md:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowFilters(false)}
          />
          {/* Sheet */}
          <div className="absolute bottom-0 left-0 right-0 bg-card border-t border-border rounded-t-2xl max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            <div className="flex items-center justify-between px-5 pb-4 pt-2">
              <h2 className="text-lg font-semibold">Filters</h2>
              <button
                onClick={() => setShowFilters(false)}
                className="p-1 rounded-full hover:bg-accent"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            <div className="px-5 pb-24 space-y-5">
              {/* Status */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Status</p>
                <div className="flex flex-wrap gap-2">
                  <Chip active={status === 'open'} onClick={() => setStatus('open')}>Open</Chip>
                  <Chip active={status === 'all'} onClick={() => setStatus('all')}>All</Chip>
                  <Chip active={status === 'filled'} onClick={() => setStatus('filled')}>Filled</Chip>
                  <Chip active={status === 'cancelled'} onClick={() => setStatus('cancelled')}>Cancelled</Chip>
                </div>
              </div>

              {/* Shift */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Shift</p>
                <div className="flex flex-wrap gap-2">
                  <Chip active={shift === 'all'} onClick={() => setShift('all')}>All</Chip>
                  <Chip active={shift === 'day'} onClick={() => setShift('day')}>Day</Chip>
                  <Chip active={shift === 'afternoon'} onClick={() => setShift('afternoon')}>Afternoon</Chip>
                  <Chip active={shift === 'night'} onClick={() => setShift('night')}>Night</Chip>
                </div>
              </div>

              {/* Location */}
              {locations.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Location</p>
                  <div className="flex flex-wrap gap-2">
                    <Chip active={location === 'all'} onClick={() => setLocation('all')}>All</Chip>
                    {locations.map((l) => (
                      <Chip key={l} active={location === l} onClick={() => setLocation(l)}>{l}</Chip>
                    ))}
                  </div>
                </div>
              )}

              {/* Date */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Date</p>
                <div className="flex items-center gap-2">
                  <DatePicker value={date} onChange={setDate} placeholder="Any date"
                    className="h-9 text-sm" />
                  {date && (
                    <button onClick={() => setDate(null)}
                      className="text-xs text-muted-foreground hover:text-foreground px-1">
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Reset */}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => { resetFilters(); setShowFilters(false) }}
              >
                Reset all filters
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Job Card ─────────────────────────────────────────────────────────────────

function JobCard({ job }: { job: JobWithCount }) {
  return (
    <Link
      href={`/dashboard/jobs/${job.id}`}
      className="group block rounded-xl bg-card border border-border p-3 md:p-4 transition-all hover:bg-accent overflow-hidden"
    >
      {/* Top row: title + status */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="font-semibold text-card-foreground text-sm leading-snug truncate">{job.title}</p>
        <span className={cn(
          'shrink-0 text-xs font-medium px-2.5 py-0.5 rounded-full border capitalize',
          STATUS_STYLES[job.status]
        )}>
          {job.status}
        </span>
      </div>

      {/* Location */}
      <p className="text-xs text-muted-foreground mb-3 truncate">{job.location}</p>

      {/* Date */}
      {job.job_date && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
          <CalendarDays className="h-3 w-3 shrink-0" />
          {new Date(job.job_date + 'T00:00:00').toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      )}

      {/* Chips + assigned count */}
      <div className="flex flex-wrap items-center gap-1.5">
        {job.shift && <CoffeeChip>{job.shift}</CoffeeChip>}
        {job.safety_shoes_required && (
          <CoffeeChip>
            <ShieldAlert className="h-3 w-3" />
            Safety Shoes
          </CoffeeChip>
        )}
        <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
          <Users className="h-3 w-3" />
          {job.assigned_count} assigned
        </span>
      </div>
    </Link>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function CoffeeChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground border border-border capitalize">
      {children}
    </span>
  )
}

function Empty({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-muted-foreground mb-4">{icon}</div>
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </div>
  )
}
