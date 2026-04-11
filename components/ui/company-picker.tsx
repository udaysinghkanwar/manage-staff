'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { Country, State, City } from 'country-state-city'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { Building2, ChevronDown, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { createCompany } from '@/lib/companies'
import { formatCompanyAddress } from '@/lib/company-utils'
import type { Company } from '@/lib/types'

interface CompanyPickerProps {
  companies: Company[]
  value: Company | null
  onChange: (company: Company | null) => void
  onCompanyCreated?: (company: Company) => void
  id?: string
  placeholder?: string
  className?: string
}

// ─── Address sub-form ─────────────────────────────────────────────────────────

function AddressForm({
  name: initialName,
  onSubmit,
  onCancel,
  isPending,
}: {
  name: string
  onSubmit: (data: {
    name: string
    street_address: string
    city: string
    province: string
    country: string
    postal_code: string
  }) => void
  onCancel: () => void
  isPending: boolean
}) {
  const [name, setName] = useState(initialName)
  const [streetAddress, setStreetAddress] = useState('')
  const [country, setCountry] = useState('CA')
  const [province, setProvince] = useState('')
  const [city, setCity] = useState('')
  const [cityQuery, setCityQuery] = useState('')
  const [cityOpen, setCityOpen] = useState(false)
  const [postalCode, setPostalCode] = useState('')
  const cityRef = useRef<HTMLDivElement>(null)

  const countries = Country.getAllCountries()
  const provinces = State.getStatesOfCountry(country)
  const allCities = province ? City.getCitiesOfState(country, province) : []
  const filteredCities = cityQuery.trim().length >= 1
    ? allCities.filter((c) => c.name.toLowerCase().startsWith(cityQuery.toLowerCase())).slice(0, 8)
    : allCities.slice(0, 8)

  // Reset province/city when country changes
  function handleCountryChange(val: string) {
    setCountry(val)
    setProvince('')
    setCity('')
    setCityQuery('')
  }

  // Reset city when province changes
  function handleProvinceChange(val: string) {
    setProvince(val)
    setCity('')
    setCityQuery('')
  }

  function selectCity(name: string) {
    setCity(name)
    setCityQuery(name)
    setCityOpen(false)
  }

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (cityRef.current && !cityRef.current.contains(e.target as Node)) {
        setCityOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleSubmit() {
    onSubmit({ name, street_address: streetAddress, city, province, country, postal_code: postalCode })
  }

  const selectClass = cn(
    'flex h-[44px] w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm',
    'focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50'
  )

  return (
    <div className="mt-3 rounded-md border bg-muted/30 p-3 space-y-3">
      <p className="text-sm font-medium">New company</p>

      <div className="space-y-1.5">
        <Label>Company name *</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} className="min-h-[44px]" autoFocus />
      </div>

      <div className="space-y-1.5">
        <Label>Street address</Label>
        <Input
          value={streetAddress}
          onChange={(e) => setStreetAddress(e.target.value)}
          placeholder="123 Main St"
          className="min-h-[44px]"
        />
      </div>

      <div className="space-y-1.5">
        <Label>Country *</Label>
        <div className="relative">
          <select
            value={country}
            onChange={(e) => handleCountryChange(e.target.value)}
            className={cn(selectClass, 'appearance-none pr-8')}
          >
            {countries.map((c) => (
              <option key={c.isoCode} value={c.isoCode}>{c.name}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Province / State *</Label>
        <div className="relative">
          <select
            value={province}
            onChange={(e) => handleProvinceChange(e.target.value)}
            className={cn(selectClass, 'appearance-none pr-8')}
            disabled={provinces.length === 0}
          >
            <option value="">Select province / state…</option>
            {provinces.map((p) => (
              <option key={p.isoCode} value={p.isoCode}>{p.name}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {/* City — searchable typeahead if cities are available, plain input otherwise */}
      <div className="space-y-1.5">
        <Label>City *</Label>
        {allCities.length > 0 ? (
          <div ref={cityRef} className="relative">
            <Input
              value={cityQuery}
              autoComplete="off"
              placeholder="Search city…"
              className="min-h-[44px]"
              disabled={!province}
              onChange={(e) => {
                setCityQuery(e.target.value)
                setCity(e.target.value)
                setCityOpen(true)
              }}
              onFocus={() => setCityOpen(true)}
            />
            {cityOpen && filteredCities.length > 0 && (
              <ul className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md text-sm max-h-48 overflow-auto">
                {filteredCities.map((c) => (
                  <li
                    key={`${c.name}-${c.stateCode}`}
                    onMouseDown={(e) => { e.preventDefault(); selectCity(c.name) }}
                    className="px-3 py-2.5 cursor-pointer hover:bg-accent hover:text-accent-foreground"
                  >
                    {c.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <Input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City"
            className="min-h-[44px]"
          />
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Postal / ZIP code</Label>
        <Input
          value={postalCode}
          onChange={(e) => setPostalCode(e.target.value)}
          placeholder="L6T 1A1"
          className="min-h-[44px]"
        />
      </div>

      <div className="flex gap-2">
        <Button type="button" size="sm" className="min-h-[40px]" onClick={handleSubmit} disabled={isPending}>
          {isPending ? 'Creating…' : 'Create & select'}
        </Button>
        <Button type="button" variant="outline" size="sm" className="min-h-[40px]" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

// ─── Company Picker ───────────────────────────────────────────────────────────

export function CompanyPicker({
  companies,
  value,
  onChange,
  onCompanyCreated,
  id,
  placeholder = 'Search company…',
  className,
}: CompanyPickerProps) {
  const [query, setQuery] = useState(value?.name ?? '')
  const [syncedId, setSyncedId] = useState<string | null>(value?.id ?? null)
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(-1)
  const [creatingOpen, setCreatingOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const containerRef = useRef<HTMLDivElement>(null)

  // Sync query when the selected company changes externally (e.g. form reset).
  if ((value?.id ?? null) !== syncedId) {
    setSyncedId(value?.id ?? null)
    setQuery(value?.name ?? '')
  }

  const trimmed = query.trim().toLowerCase()
  const matches = trimmed.length >= 1
    ? companies.filter((c) => c.name.toLowerCase().includes(trimmed)).slice(0, 8)
    : companies.slice(0, 8)

  const exactMatch = companies.find((c) => c.name.toLowerCase() === trimmed)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function select(company: Company) {
    setQuery(company.name)
    onChange(company)
    setOpen(false)
    setHighlighted(-1)
  }

  function handleCreate(data: {
    name: string
    street_address: string
    city: string
    province: string
    country: string
    postal_code: string
  }) {
    if (!data.name.trim()) { toast.error('Company name is required.'); return }
    if (!data.city.trim()) { toast.error('City is required.'); return }
    if (!data.province.trim()) { toast.error('Province/state is required.'); return }
    startTransition(async () => {
      const result = await createCompany(data)
      if (result.error || !result.company) {
        toast.error(result.error ?? 'Failed to create company.')
        return
      }
      toast.success(`${result.company.name} added`)
      onCompanyCreated?.(result.company)
      select(result.company)
      setCreatingOpen(false)
    })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) { setOpen(true); return }
      setHighlighted((h) => Math.min(h + 1, matches.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter' && highlighted >= 0) {
      e.preventDefault()
      select(matches[highlighted])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <Input
        id={id}
        value={query}
        autoComplete="off"
        placeholder={placeholder}
        className="min-h-[44px]"
        onChange={(e) => {
          setQuery(e.target.value)
          if (value && e.target.value !== value.name) onChange(null)
          setOpen(true)
          setHighlighted(-1)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
      />

      {open && (
        <ul className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md text-sm max-h-72 overflow-auto">
          {matches.map((c, i) => (
            <li
              key={c.id}
              onMouseDown={(e) => { e.preventDefault(); select(c) }}
              className={cn(
                'flex items-start gap-2 px-3 py-2.5 cursor-pointer select-none',
                i === highlighted
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="font-medium truncate">{c.name}</div>
                <div className="text-xs text-muted-foreground truncate">{formatCompanyAddress(c)}</div>
              </div>
            </li>
          ))}

          {trimmed.length >= 1 && !exactMatch && (
            <li
              onMouseDown={(e) => {
                e.preventDefault()
                setOpen(false)
                setCreatingOpen(true)
              }}
              className="flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none border-t text-primary hover:bg-accent"
            >
              <Plus className="h-3.5 w-3.5 shrink-0" />
              <span>Create <span className="font-medium">&quot;{query.trim()}&quot;</span></span>
            </li>
          )}

          {matches.length === 0 && trimmed.length === 0 && (
            <li className="px-3 py-2.5 text-muted-foreground">Type to search companies…</li>
          )}
        </ul>
      )}

      {creatingOpen && (
        <AddressForm
          name={query.trim()}
          onSubmit={handleCreate}
          onCancel={() => setCreatingOpen(false)}
          isPending={isPending}
        />
      )}
    </div>
  )
}
