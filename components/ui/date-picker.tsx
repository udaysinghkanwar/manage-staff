'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface DatePickerProps {
  value?: string | null        // ISO date string "YYYY-MM-DD"
  onChange?: (value: string | null) => void
  placeholder?: string
  className?: string
}

export function DatePicker({
  value, onChange, placeholder = 'Pick a date', className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false)

  const selected = value ? new Date(value + 'T00:00:00') : undefined

  function handleSelect(day: Date | undefined) {
    onChange?.(day ? format(day, 'yyyy-MM-dd') : null)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          'flex h-9 w-full items-center justify-start gap-2 rounded-lg border border-input bg-transparent px-3 py-2 text-sm text-left transition-colors',
          'hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          !selected && 'text-muted-foreground',
          className
        )}
      >
        <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
        {selected ? format(selected, 'PPP') : placeholder}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={handleSelect}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
