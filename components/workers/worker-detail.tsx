'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { updateWorker, deactivateWorker } from '@/lib/workers'
import type { WorkerHistory } from '@/lib/workers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { DayOfWeek, ShiftType, AvailabilityType, WorkerGender } from '@/lib/types'
import { DAYS, DAY_LABELS } from '@/lib/constants'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function WorkerDetail({ data }: { data: WorkerHistory }) {
  const { worker, assignments, broadcasts } = data
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Edit state mirrors worker fields
  const [name, setName] = useState(worker.name)
  const [phone, setPhone] = useState(worker.phone)
  const [address, setAddress] = useState(worker.address ?? '')
  const [gender, setGender] = useState<WorkerGender | ''>(worker.gender ?? '')
  const [shift, setShift] = useState<ShiftType | ''>(worker.shift ?? '')
  const [availType, setAvailType] = useState<AvailabilityType | ''>(worker.availability_type ?? '')
  const [availDays, setAvailDays] = useState<DayOfWeek[]>(worker.available_days ?? [])
  const [notes, setNotes] = useState(worker.notes ?? '')

  function cancelEdit() {
    setName(worker.name)
    setPhone(worker.phone)
    setAddress(worker.address ?? '')
    setGender(worker.gender ?? '')
    setShift(worker.shift ?? '')
    setAvailType(worker.availability_type ?? '')
    setAvailDays(worker.available_days ?? [])
    setNotes(worker.notes ?? '')
    setError(null)
    setEditing(false)
  }

  function toggleDay(day: DayOfWeek) {
    setAvailDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])
  }

  function handleSave() {
    if (!name.trim()) { setError('Name is required.'); return }
    if (!phone.trim() || !/^\+?[\d\s\-().]{7,}$/.test(phone.trim())) {
      setError('Enter a valid phone number.'); return
    }
    if (availType === 'part-time' && availDays.length === 0) {
      setError('Select at least one available day.'); return
    }
    setError(null)
    startTransition(async () => {
      const result = await updateWorker(worker.id, {
        name: name.trim(), phone: phone.trim(),
        address: address || undefined,
        gender: gender || undefined,
        shift: shift || undefined,
        availability_type: availType || undefined,
        available_days: availType === 'part-time' ? availDays : [],
        notes: notes || undefined,
      })
      if (result?.error) { setError(result.error) } else { setEditing(false) }
    })
  }

  // Find active assignment from assignments list
  const activeAssignment = assignments.find(a => a.job.status === 'open')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{worker.name}</h1>
          <p className="text-muted-foreground">{worker.phone}</p>
        </div>
        <div className="flex items-center gap-2">
          {worker.status === 'inactive' && (
            <Badge variant="secondary">Inactive</Badge>
          )}
          {activeAssignment && (
            <Badge className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400">
              Assigned
            </Badge>
          )}
        </div>
      </div>

      {activeAssignment && (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm">
          Currently assigned to{' '}
          <Link href={`/dashboard/jobs/${activeAssignment.job.id}`} className="font-medium underline underline-offset-2">
            {activeAssignment.job.title}
          </Link>
        </div>
      )}

      {/* Worker info */}
      <div className="rounded-xl border bg-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Worker Info</h2>
          {!editing && worker.status === 'active' && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="min-h-[36px]">
              Edit
            </Button>
          )}
        </div>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>
        )}

        {editing ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} className="min-h-[44px]" />
            </div>
            <div className="space-y-1.5">
              <Label>Phone *</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} className="min-h-[44px]" />
            </div>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Textarea value={address} onChange={e => setAddress(e.target.value)} rows={2} />
            </div>
            <fieldset className="space-y-1.5">
              <legend className="text-sm font-medium">Gender</legend>
              <div className="flex gap-4">
                {(['male', 'female'] as WorkerGender[]).map(g => (
                  <label key={g} className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                    <input type="radio" checked={gender === g} onChange={() => setGender(g)} className="w-4 h-4" />
                    <span className="capitalize">{g}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className="space-y-1.5">
              <legend className="text-sm font-medium">Shift</legend>
              <div className="flex gap-4">
                {(['day', 'afternoon', 'night'] as ShiftType[]).map(s => (
                  <label key={s} className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                    <input type="radio" checked={shift === s} onChange={() => setShift(s)} className="w-4 h-4" />
                    <span className="capitalize">{s}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className="space-y-1.5">
              <legend className="text-sm font-medium">Availability</legend>
              <div className="flex gap-4">
                {(['full-time', 'part-time'] as AvailabilityType[]).map(a => (
                  <label key={a} className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                    <input type="radio" checked={availType === a} onChange={() => setAvailType(a)} className="w-4 h-4" />
                    <span className="capitalize">{a}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            {availType === 'part-time' && (
              <div className="flex flex-wrap gap-2">
                {DAYS.map(({ value, label }) => (
                  <button
                    key={value} type="button"
                    onClick={() => toggleDay(value)}
                    className={`px-3 py-2 rounded-md border text-sm font-medium min-h-[44px] transition-colors ${
                      availDays.includes(value)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border hover:bg-muted'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
            </div>
            <div className="flex gap-2 pt-1">
              <Button onClick={handleSave} disabled={isPending} className="min-h-[44px]">
                {isPending ? 'Saving…' : 'Save'}
              </Button>
              <Button variant="outline" onClick={cancelEdit} disabled={isPending} className="min-h-[44px]">
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Gender</dt>
              <dd className="font-medium capitalize">{worker.gender ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Shift</dt>
              <dd className="font-medium capitalize">{worker.shift ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Availability</dt>
              <dd className="font-medium capitalize">{worker.availability_type ?? '—'}</dd>
            </div>
            {worker.availability_type === 'part-time' && (
              <div>
                <dt className="text-muted-foreground">Days</dt>
                <dd className="font-medium">
                  {worker.available_days?.map(d => DAY_LABELS[d] ?? d).join(', ') ?? '—'}
                </dd>
              </div>
            )}
            <div className="col-span-2">
              <dt className="text-muted-foreground">Address</dt>
              <dd className="font-medium">{worker.address ?? '—'}</dd>
            </div>
            {worker.notes && (
              <div className="col-span-2">
                <dt className="text-muted-foreground">Notes</dt>
                <dd className="font-medium">{worker.notes}</dd>
              </div>
            )}
            <div>
              <dt className="text-muted-foreground">Added</dt>
              <dd className="font-medium">{formatDate(worker.created_at)}</dd>
            </div>
          </dl>
        )}
      </div>

      {/* Job history */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <h2 className="font-medium">Job History</h2>
        {assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No job assignments yet.</p>
        ) : (
          <ul className="space-y-2">
            {assignments.map(a => (
              <li key={a.id} className="flex items-center justify-between text-sm gap-4">
                <div className="min-w-0">
                  <Link href={`/dashboard/jobs/${a.job.id}`} className="font-medium hover:underline truncate block">
                    {a.job.title}
                  </Link>
                  <p className="text-muted-foreground text-xs">{a.job.location} · {formatDate(a.assigned_at)}</p>
                </div>
                <Badge variant={a.job.status === 'open' ? 'default' : 'secondary'} className="capitalize shrink-0">
                  {a.job.status}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Broadcast history */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <h2 className="font-medium">Broadcast History</h2>
        {broadcasts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No broadcasts sent yet.</p>
        ) : (
          <ul className="space-y-2">
            {broadcasts.map(b => (
              <li key={b.id} className="flex items-center justify-between text-sm gap-4">
                <div className="min-w-0">
                  <Link href={`/dashboard/jobs/${b.job.id}`} className="font-medium hover:underline truncate block">
                    {b.job.title}
                  </Link>
                  <p className="text-muted-foreground text-xs">{formatDate(b.sent_at)}</p>
                </div>
                <Badge
                  className={
                    b.response === 'yes'
                      ? 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400'
                      : b.response === 'no'
                      ? 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400'
                      : ''
                  }
                  variant={b.response === 'pending' ? 'secondary' : undefined}
                >
                  {b.response.charAt(0).toUpperCase() + b.response.slice(1)}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Danger zone */}
      {worker.status === 'active' && (
        <>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Deactivate worker</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Removes them from availability. Does not delete their history.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              className="min-h-[44px]"
              disabled={isPending}
              onClick={() => startTransition(async () => { await deactivateWorker(worker.id) })}
            >
              Deactivate
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
