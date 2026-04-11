'use client'

import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { ONTARIO_CITIES } from '@/lib/ontario-cities'
import { cn } from '@/lib/utils'
import { MapPin } from 'lucide-react'

interface CityPickerProps {
  value: string
  onChange: (value: string) => void
  id?: string
  placeholder?: string
  className?: string
}

export function CityPicker({
  value,
  onChange,
  id,
  placeholder = 'Search Ontario city…',
  className,
}: CityPickerProps) {
  const [query, setQuery] = useState(value)
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)

  // Sync display when value changes externally (e.g. edit form reset)
  useEffect(() => {
    setQuery(value)
  }, [value])

  const matches =
    query.trim().length >= 1
      ? ONTARIO_CITIES.filter((c) =>
          c.toLowerCase().startsWith(query.trim().toLowerCase())
        ).slice(0, 8)
      : []

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function select(city: string) {
    setQuery(city)
    onChange(city)
    setOpen(false)
    setHighlighted(-1)
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
          onChange(e.target.value)
          setOpen(true)
          setHighlighted(-1)
        }}
        onFocus={() => {
          if (query.trim().length >= 1) setOpen(true)
        }}
        onKeyDown={handleKeyDown}
      />
      {open && matches.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md text-sm max-h-60 overflow-auto">
          {matches.map((city, i) => (
            <li
              key={city}
              onMouseDown={(e) => { e.preventDefault(); select(city) }}
              className={cn(
                'flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none',
                i === highlighted
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              {city}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
