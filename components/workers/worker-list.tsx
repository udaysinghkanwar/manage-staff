'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { FilterDropdown } from '@/components/ui/filter-dropdown'
import { Users, Search, UserPlus, Phone, Calendar, X } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { DAY_LABELS } from '@/lib/constants'
import { formatPhone } from '@/lib/phone'
import type { WorkerWithAssignment } from '@/lib/workers'

type GenderFilter = 'all' | 'male' | 'female'
type ShiftFilter  = 'all' | 'day' | 'afternoon' | 'night'
type AvailFilter  = 'all' | 'full-time' | 'part-time'
type AssignFilter = 'all' | 'available' | 'assigned'

export function WorkerList({ workers }: { workers: WorkerWithAssignment[] }) {
  const [search, setSearch]   = useState('')
  const [gender, setGender]   = useState<GenderFilter>('all')
  const [shift, setShift]     = useState<ShiftFilter>('all')
  const [avail, setAvail]     = useState<AvailFilter>('all')
  const [assign, setAssign]   = useState<AssignFilter>('all')
  const [location, setLocation] = useState('all')

  const isFiltered = search || gender !== 'all' || shift !== 'all' || avail !== 'all' || assign !== 'all' || location !== 'all'

  function resetFilters() {
    setSearch(''); setGender('all'); setShift('all')
    setAvail('all'); setAssign('all'); setLocation('all')
  }

  // Extract unique locations from addresses
  const locations = useMemo(() => {
    const cities = new Set<string>()
    for (const w of workers) {
      if (w.address) {
        const city = w.address.split(',')[0].trim()
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
    if (shift !== 'all' && w.shift !== shift) return false
    if (avail !== 'all' && w.availability_type !== avail) return false
    if (assign === 'available' && w.is_assigned) return false
    if (assign === 'assigned' && !w.is_assigned) return false
    if (location !== 'all' && !w.address?.toLowerCase().includes(location.toLowerCase())) return false
    return true
  })

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-border">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Workers</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{workers.length} total</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search workers…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 w-48 text-sm"
            />
          </div>
          <Link
            href="/dashboard/workers/new"
            className={cn(buttonVariants({ size: 'sm' }), 'gap-1.5 h-8')}
          >
            <UserPlus className="h-3.5 w-3.5" />
            Add Worker
          </Link>
        </div>
      </div>

      {/* Filter strip */}
      <div className="flex items-end gap-4 px-6 py-4 border-b border-border flex-wrap min-h-[72px]">
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
            <span className="text-xs text-transparent select-none">·</span>
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
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {workers.length === 0 ? (
          <Empty
            icon={<Users className="h-8 w-8" />}
            title="No workers yet"
            description="Add your first worker to get started."
          />
        ) : filtered.length === 0 ? (
          <p className="text-sm text-zinc-500 text-center py-12">
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
    </div>
  )
}

// ─── Worker Card ─────────────────────────────────────────────────────────────

function WorkerCard({ worker }: { worker: WorkerWithAssignment }) {
  return (
    <Link
      href={`/dashboard/workers/${worker.id}`}
      className={cn(
        'group block rounded-xl bg-card border border-border p-4 transition-all hover:bg-accent',
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
        {worker.shift && <CoffeeChip>{worker.shift}</CoffeeChip>}
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
      <div className="text-zinc-700 mb-4">{icon}</div>
      <p className="text-sm font-medium text-zinc-400">{title}</p>
      <p className="text-xs text-zinc-600 mt-1">{description}</p>
    </div>
  )
}
