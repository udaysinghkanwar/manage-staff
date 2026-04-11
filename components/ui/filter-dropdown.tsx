'use client'

import { ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface FilterDropdownProps {
  label: string
  value: string
  onValueChange: (v: string) => void
  options: { value: string; label: string }[]
}

export function FilterDropdown({ label, value, onValueChange, options }: FilterDropdownProps) {
  const selected = options.find((o) => o.value === value)

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            'flex h-7 items-center justify-between gap-1.5 rounded-lg border border-input',
            'bg-transparent px-2.5 text-xs font-medium text-foreground min-w-[100px]',
            'hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          )}
        >
          <span>{selected?.label ?? value}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="bottom" sideOffset={4} className="min-w-[140px]">
          <DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
            {options.map((o) => (
              <DropdownMenuRadioItem key={o.value} value={o.value}>
                {o.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
