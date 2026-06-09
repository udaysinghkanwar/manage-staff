'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { FilterDropdown } from '@/components/ui/filter-dropdown'
import { Button } from '@/components/ui/button'
import { Users, Search, UserPlus, Phone, Calendar, X, SlidersHorizontal } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { DAY_LABELS } from '@/lib/constants'
import { formatPhone } from '@/lib/phone'
import type { WorkerWithAssignment } from '@/lib/workers'

type GenderFilter = 'all' | 'male' | 'female'
type ShiftFilter  = 'all' | 'day' | 'afternoon' | 'night'
type AvailFilter  = 'all' | 'full-time' | 'part-time'
type AssignFilter = 'all' | 'available' | 'assigned'

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

export function WorkerList({ workers }: { workers: WorkerWithAssignment[] }) {
  const [search, setSearch]   = useState('')
  const [gender, setGender]   = useState<GenderFilter>('all')
  const [shift, setShift]     = useState<ShiftFilter>('all')
  const [avail, setAvail]     = useState<AvailFilter>('all')
  const [assign, setAssign]   = useState<AssignFilter>('all')
  const [location, setLocation] = useState('all')
  const [showFilters, setShowFilters] = useState(false)

  const isFiltered = gender !== 'all' || shift !== 'all' || avail !== 'all' || assign !== 'all' || location !== 'all'
  const activeFilterCount = [gender, shift, avail, assign, location].filter(v => v !== 'all').length

  function resetFilters() {
    setGender('all'); setShift('all')
    setAvail('all'); setAssign('all'); setLocation('all')
  }

  const locations = useMemo(() => {
    const cities = new Set<string>()
    for (const w of workers) {
      if (w.city) {
        const city = w.city.split(',')[0].trim()
        if (city) cities.add(city)
      }
    }
    return Array.from(cities).sort()
  }, [workers])

  const filtered = workers.filter((w) => {
    if (search) {
      const q = search.toLowerCase()
      if (!w.name.toLowerCase().includes(q) && !w.phone.includes(q)) return false
    }
    if (gender !== 'all' && w.gender !== gender) return false
    if (shift !== 'all' && !w.shifts?.includes(shift)) return false
    if (avail !== 'all' && w.availability_type !== avail) return false
    if (assign === 'available' && w.is_assigned) return false
    if (assign === 'assigned' && !w.is_assigned) return false
    if (location !== 'all' && !w.city?.toLowerCase().includes(location.toLowerCase())) return false
    return true
  })

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col gap-3 px-4 md:px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Workers</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{workers.length} total</p>
          </div>
          <Link
            href="/dashboard/workers/new"
            className={cn(buttonVariants({ size: 'sm' }), 'gap-1.5 h-8 shrink-0')}
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Add Worker</span>
            <span className="sm:hidden">Add</span>
          </Link>
        </div>

        {/* Search + filter icon (mobile) */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search workers…"
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
        <Chip active={assign === 'all'} onClick={() => setAssign('all')}>All</Chip>
        <Chip active={assign === 'available'} onClick={() => setAssign('available')}>Available</Chip>
        <Chip active={assign === 'assigned'} onClick={() => setAssign('assigned')}>Assigned</Chip>
      </div>

      {/* Filter strip — desktop only */}
      <div className="hidden md:flex items-end gap-3 px-6 py-3 border-b border-border flex-wrap">
        <span className="text-xs font-medium text-muted-foreground mb-1 shrink-0">Filters</span>
        <FilterDropdown label="Gender" value={gender}
          onValueChange={(v) => setGender(v as GenderFilter)}
          options={[
            { value: 'all', label: 'All' },
            { value: 'male', label: 'Male' },
            { value: 'female', label: 'Female' },
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
        <FilterDropdown label="Availability" value={avail}
          onValueChange={(v) => setAvail(v as AvailFilter)}
          options={[
            { value: 'all', label: 'All' },
            { value: 'full-time', label: 'Full-time' },
            { value: 'part-time', label: 'Part-time' },
          ]}
        />
        <FilterDropdown label="Status" value={assign}
          onValueChange={(v) => setAssign(v as AssignFilter)}
          options={[
            { value: 'all', label: 'All' },
            { value: 'available', label: 'Available' },
            { value: 'assigned', label: 'Assigned' },
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
        {workers.length === 0 ? (
          <Empty
            icon={<Users className="h-8 w-8" />}
            title="No workers yet"
            description="Add your first worker to get started."
          />
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">
            No workers match the selected filters.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map((worker) => (
              <WorkerCard key={worker.id} worker={worker} />
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
                  <Chip active={assign === 'all'} onClick={() => setAssign('all')}>All</Chip>
                  <Chip active={assign === 'available'} onClick={() => setAssign('available')}>Available</Chip>
                  <Chip active={assign === 'assigned'} onClick={() => setAssign('assigned')}>Assigned</Chip>
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

              {/* Gender */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Gender</p>
                <div className="flex flex-wrap gap-2">
                  <Chip active={gender === 'all'} onClick={() => setGender('all')}>All</Chip>
                  <Chip active={gender === 'male'} onClick={() => setGender('male')}>Male</Chip>
                  <Chip active={gender === 'female'} onClick={() => setGender('female')}>Female</Chip>
                </div>
              </div>

              {/* Availability */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Availability</p>
                <div className="flex flex-wrap gap-2">
                  <Chip active={avail === 'all'} onClick={() => setAvail('all')}>All</Chip>
                  <Chip active={avail === 'full-time'} onClick={() => setAvail('full-time')}>Full-Time</Chip>
                  <Chip active={avail === 'part-time'} onClick={() => setAvail('part-time')}>Part-Time</Chip>
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

// ─── Worker Card ─────────────────────────────────────────────────────────────

function WorkerCard({ worker }: { worker: WorkerWithAssignment }) {
  return (
    <Link
      href={`/dashboard/workers/${worker.id}`}
      className={cn(
        'group block rounded-xl bg-card border border-border p-3 md:p-4 transition-all hover:bg-accent overflow-hidden',
        worker.is_assigned && 'border-amber-500/30 hover:border-amber-500/50'
      )}
    >
      {/* Top row: name + status */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="font-semibold text-card-foreground text-sm leading-snug">{worker.name}</p>
        {worker.is_assigned ? (
          <span className="shrink-0 text-xs font-medium px-2.5 py-0.5 rounded-full border border-amber-600/60 text-amber-400">
            Assigned
          </span>
        ) : (
          <span className="shrink-0 text-xs font-medium px-2.5 py-0.5 rounded-full border border-emerald-600/60 text-emerald-400">
            Available
          </span>
        )}
      </div>

      {/* Phone */}
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
        <Phone className="h-3 w-3 shrink-0" />
        {formatPhone(worker.phone)}
      </p>

      {/* Chips */}
      <div className="flex flex-wrap gap-1.5">
        {worker.gender && <CoffeeChip>{worker.gender}</CoffeeChip>}
        {worker.shifts?.map((s) => <CoffeeChip key={s}>{s}</CoffeeChip>)}
        {worker.availability_type && (
          <CoffeeChip>{worker.availability_type === 'full-time' ? 'Full-Time' : 'Part-Time'}</CoffeeChip>
        )}
      </div>

      {/* Days */}
      {worker.available_days?.length ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2.5">
          <Calendar className="h-3 w-3 shrink-0" />
          {worker.available_days.map((d) => DAY_LABELS[d] ?? d).join(' · ')}
        </p>
      ) : null}
    </Link>
  )
}

function CoffeeChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground border border-border capitalize">
      {children}
    </span>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Empty({
  icon, title, description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-muted-foreground mb-4">{icon}</div>
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </div>
  )
}
