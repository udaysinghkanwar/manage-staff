'use client'

import { useState, useActionState } from 'react'
import { createJob } from '@/lib/jobs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DatePicker } from '@/components/ui/date-picker'
import { Counter } from '@/components/ui/counter'
import { CompanyPicker } from '@/components/ui/company-picker'
import { formatCompanyLocation } from '@/lib/company-utils'
import type { ShiftType, JobType, Company } from '@/lib/types'

type FormState = { error: string | null } | null

async function submit(_prev: FormState, formData: FormData): Promise<FormState> {
  const title = (formData.get('title') as string)?.trim()
  const location = (formData.get('location') as string)?.trim()
  const job_type = (formData.get('job_type') as JobType) || 'on-call'
  const shift = formData.get('shift') as ShiftType | null
  const description = formData.get('description') as string
  const safety_shoes_required = formData.get('safety_shoes_required') === 'true'
  const job_date = job_type === 'on-call' ? ((formData.get('job_date') as string) || null) : null
  const required_male = parseInt(formData.get('required_male') as string) || 0
  const required_female = parseInt(formData.get('required_female') as string) || 0
  const company_id = (formData.get('company_id') as string) || null

  if (!title) return { error: 'Job title is required.' }
  if (!company_id) return { error: 'Company is required.' }
  if (!location) return { error: 'Location is required.' }
  if (!shift) return { error: 'Shift is required.' }

  const result = await createJob({
    title, location, job_type, shift: shift!, description,
    safety_shoes_required,
    job_date, required_male, required_female,
    company_id,
  })

  return result ?? null
}

export function NewJobForm({ companies: initialCompanies }: { companies: Company[] }) {
  const [state, action, pending] = useActionState(submit, null)
  const [jobType, setJobType] = useState<JobType>('on-call')
  const [safetyShoes, setSafetyShoes] = useState(false)
  const [jobDate, setJobDate] = useState<string | null>(null)
  const [requiredMale, setRequiredMale] = useState(0)
  const [requiredFemale, setRequiredFemale] = useState(0)
  const [companies, setCompanies] = useState<Company[]>(initialCompanies)
  const [company, setCompany] = useState<Company | null>(null)
  const [location, setLocation] = useState('')

  function handleCompanyChange(next: Company | null) {
    setCompany(next)
    if (next) setLocation(formatCompanyLocation(next))
  }

  function handleCompanyCreated(next: Company) {
    setCompanies((prev) => [...prev, next].sort((a, b) => a.name.localeCompare(b.name)))
  }

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
        <Label htmlFor="company">Company <span className="text-destructive">*</span></Label>
        <input type="hidden" name="company_id" value={company?.id ?? ''} />
        <CompanyPicker
          id="company"
          companies={companies}
          value={company}
          onChange={handleCompanyChange}
          onCompanyCreated={handleCompanyCreated}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="location">Location <span className="text-destructive">*</span></Label>
        <Input
          id="location"
          name="location"
          placeholder="Brampton, ON"
          className="min-h-[44px]"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
      </div>

      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium">Job type <span className="text-destructive">*</span></legend>
        <input type="hidden" name="job_type" value={jobType} />
        <div className="flex gap-4">
          {(['on-call', 'full-time'] as JobType[]).map((t) => (
            <label key={t} className="flex items-center gap-2 cursor-pointer min-h-[44px]">
              <input type="radio" name="_job_type" value={t} className="w-4 h-4"
                checked={jobType === t} onChange={() => setJobType(t)} />
              <span className="capitalize">{t}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {jobType === 'on-call' && (
        <div className="space-y-1.5">
          <Label>Job date</Label>
          <input type="hidden" name="job_date" value={jobDate ?? ''} />
          <DatePicker value={jobDate} onChange={setJobDate} placeholder="Select a date" />
        </div>
      )}

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

      <div className="space-y-1.5">
        <Label htmlFor="description">Work description</Label>
        <Textarea id="description" name="description" placeholder="Describe the work…" rows={3} />
      </div>

      <label className="flex items-center gap-3 cursor-pointer min-h-[44px]">
        <input type="checkbox" className="w-4 h-4" checked={safetyShoes}
          onChange={(e) => setSafetyShoes(e.target.checked)} />
        <input type="hidden" name="safety_shoes_required" value={String(safetyShoes)} />
        <span className="text-sm font-medium">Safety shoes required</span>
      </label>

      <div className="space-y-3">
        <p className="text-sm font-medium">Workers needed</p>
        <input type="hidden" name="required_male" value={requiredMale} />
        <input type="hidden" name="required_female" value={requiredFemale} />
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Male</span>
          <Counter value={requiredMale} onChange={setRequiredMale} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Female</span>
          <Counter value={requiredFemale} onChange={setRequiredFemale} />
        </div>
      </div>

      <Button type="submit" className="w-full min-h-[44px]" disabled={pending}>
        {pending ? 'Creating…' : 'Create Job'}
      </Button>
    </form>
  )
}
