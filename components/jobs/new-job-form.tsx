'use client'

import { useState, useActionState } from 'react'
import { createJob } from '@/lib/jobs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DAYS } from '@/lib/constants'
import type { ShiftType, DayOfWeek } from '@/lib/types'

type FormState = { error: string | null } | null

async function submit(_prev: FormState, formData: FormData): Promise<FormState> {
  const title = (formData.get('title') as string)?.trim()
  const location = (formData.get('location') as string)?.trim()
  const shift = formData.get('shift') as ShiftType | null
  const description = formData.get('description') as string
  const safety_shoes_required = formData.get('safety_shoes_required') === 'true'
  const required_days = formData.getAll('required_days') as DayOfWeek[]

  if (!title) return { error: 'Job title is required.' }
  if (!location) return { error: 'Location is required.' }
  if (!shift) return { error: 'Shift is required.' }

  const result = await createJob({
    title, location, shift, description,
    safety_shoes_required,
    required_days: required_days.length ? required_days : undefined,
  })

  return result ?? null
}

export function NewJobForm() {
  const [state, action, pending] = useActionState(submit, null)
  const [safetyShoes, setSafetyShoes] = useState(false)

  return (
    <form action={action} className="space-y-5">
      {state?.error && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
          {state.error}
        </p>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="title">Job title <span className="text-destructive">*</span></Label>
        <Input id="title" name="title" placeholder="Warehouse Associate" className="min-h-[44px]" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="location">Location <span className="text-destructive">*</span></Label>
        <Input id="location" name="location" placeholder="Brampton, ON" className="min-h-[44px]" />
      </div>

      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium">Shift <span className="text-destructive">*</span></legend>
        <div className="flex gap-4">
          {(['day', 'afternoon', 'night'] as ShiftType[]).map((s) => (
            <label key={s} className="flex items-center gap-2 cursor-pointer min-h-[44px]">
              <input type="radio" name="shift" value={s} className="w-4 h-4" required />
              <span className="capitalize">{s}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium">Required days <span className="text-muted-foreground text-xs font-normal">(optional — used to match part-time workers)</span></legend>
        <div className="flex flex-wrap gap-2">
          {DAYS.map(({ value, label }) => (
            <label
              key={value}
              className="flex items-center gap-1.5 cursor-pointer border rounded-md px-3 py-2 min-h-[44px] has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:checked]:border-primary transition-colors"
            >
              <input type="checkbox" name="required_days" value={value} className="sr-only" />
              <span className="text-sm font-medium">{label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-1.5">
        <Label htmlFor="description">Work description</Label>
        <Textarea id="description" name="description" placeholder="Describe the work…" rows={3} />
      </div>

      <label className="flex items-center gap-3 cursor-pointer min-h-[44px]">
        <input
          type="checkbox"
          className="w-4 h-4"
          checked={safetyShoes}
          onChange={(e) => setSafetyShoes(e.target.checked)}
        />
        <input type="hidden" name="safety_shoes_required" value={String(safetyShoes)} />
        <span className="text-sm font-medium">Safety shoes required</span>
      </label>

      <Button type="submit" className="w-full min-h-[44px]" disabled={pending}>
        {pending ? 'Creating…' : 'Create Job'}
      </Button>
    </form>
  )
}
