'use client'

import { useState, useEffect } from 'react'
import { useActionState } from 'react'
import { createWorker } from '@/lib/workers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { DayOfWeek, ShiftType, AvailabilityType, WorkerGender } from '@/lib/types'
import { DAYS } from '@/lib/constants'

type FormState = { error: string | null; field?: string } | null

async function submitWorker(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = formData.get('name') as string
  const phone = formData.get('phone') as string
  const address = formData.get('address') as string
  const gender = formData.get('gender') as WorkerGender | null
  const shift = formData.get('shift') as ShiftType | null
  const availability_type = formData.get('availability_type') as AvailabilityType | null
  const available_days = formData.getAll('available_days') as DayOfWeek[]
  const notes = formData.get('notes') as string

  if (!name?.trim()) return { error: 'Name is required.' }

  const phoneClean = phone?.trim()
  if (!phoneClean) return { error: 'Phone number is required.' }
  if (!/^\+?[\d\s\-().]{7,}$/.test(phoneClean)) return { error: 'Enter a valid phone number.' }

  if (availability_type === 'part-time' && available_days.length === 0) {
    return { error: 'Select at least one available day for part-time workers.' }
  }

  const result = await createWorker({
    name, phone: phoneClean, address, notes,
    gender: gender || undefined,
    shift: shift || undefined,
    availability_type: availability_type || undefined,
    available_days: availability_type === 'part-time' ? available_days : undefined,
  })

  return result ?? null
}

// Tracks controlled values for fields that can have server-side unique errors.
// When a field error comes back, we clear only that field's value.
type ControlledFields = Record<string, string>

export function NewWorkerForm() {
  const [state, action, pending] = useActionState(submitWorker, null)
  const [availType, setAvailType] = useState<string>('')
  const [controlled, setControlled] = useState<ControlledFields>({ phone: '' })

  useEffect(() => {
    if (state?.field) {
      setControlled(prev => ({ ...prev, [state.field!]: '' }))
    }
  }, [state])

  const fieldError = (name: string) =>
    state?.field === name ? state.error : null

  const controlledProps = (name: string) =>
    name in controlled
      ? { value: controlled[name], onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
          setControlled(prev => ({ ...prev, [name]: e.target.value })) }
      : {}

  return (
    <form action={action} className="space-y-5">
      {state?.error && !state.field && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
          {state.error}
        </p>
      )}

      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="name">Name <span className="text-destructive">*</span></Label>
        <Input id="name" name="name" placeholder="Full name" className="min-h-[44px]" required />
      </div>

      {/* Phone */}
      <div className="space-y-1.5">
        <Label htmlFor="phone">Phone <span className="text-destructive">*</span></Label>
        <Input
          id="phone" name="phone" type="tel" placeholder="+1 416 555 0100"
          className={`min-h-[44px] ${fieldError('phone') ? 'border-destructive focus-visible:ring-destructive/50' : ''}`}
          {...controlledProps('phone')}
          required
        />
        {fieldError('phone') && (
          <p className="text-xs text-destructive">{fieldError('phone')}</p>
        )}
      </div>

      {/* Address */}
      <div className="space-y-1.5">
        <Label htmlFor="address">Address</Label>
        <Textarea id="address" name="address" placeholder="123 Main St, Brampton, ON" rows={2} />
      </div>

      {/* Gender */}
      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium">Gender</legend>
        <div className="flex gap-4">
          {(['male', 'female'] as WorkerGender[]).map((g) => (
            <label key={g} className="flex items-center gap-2 cursor-pointer min-h-[44px]">
              <input type="radio" name="gender" value={g} className="w-4 h-4" />
              <span className="capitalize">{g}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Shift */}
      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium">Shift preference</legend>
        <div className="flex gap-4">
          {(['day', 'afternoon', 'night'] as ShiftType[]).map((s) => (
            <label key={s} className="flex items-center gap-2 cursor-pointer min-h-[44px]">
              <input type="radio" name="shift" value={s} className="w-4 h-4" />
              <span className="capitalize">{s}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Availability */}
      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium">Availability</legend>
        <div className="flex gap-4">
          {(['full-time', 'part-time'] as AvailabilityType[]).map((a) => (
            <label key={a} className="flex items-center gap-2 cursor-pointer min-h-[44px]">
              <input
                type="radio" name="availability_type" value={a}
                className="w-4 h-4"
                onChange={() => setAvailType(a)}
              />
              <span className="capitalize">{a}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Available days — only shown for part-time */}
      {availType === 'part-time' && (
        <fieldset className="space-y-1.5">
          <legend className="text-sm font-medium">Available days</legend>
          <div className="flex flex-wrap gap-2">
            {DAYS.map(({ value, label }) => (
              <label
                key={value}
                className="flex items-center gap-1.5 cursor-pointer border rounded-md px-3 py-2 min-h-[44px] has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:checked]:border-primary transition-colors"
              >
                <input type="checkbox" name="available_days" value={value} className="sr-only" />
                <span className="text-sm font-medium">{label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" placeholder="Any additional notes…" rows={3} />
      </div>

      <Button type="submit" className="w-full min-h-[44px]" disabled={pending}>
        {pending ? 'Saving…' : 'Add Worker'}
      </Button>
    </form>
  )
}
