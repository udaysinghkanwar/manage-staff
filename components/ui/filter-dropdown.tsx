'use client'

import { ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
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

interface MultiFilterDropdownProps {
  label: string
  values: string[]
  onValuesChange: (next: string[]) => void
  options: { value: string; label: string }[]
  placeholder?: string
}

export function MultiFilterDropdown({
  label, values, onValuesChange, options, placeholder = 'All',
}: MultiFilterDropdownProps) {
  const selectedSet = new Set(values)
  const triggerLabel = (() => {
    if (values.length === 0) return placeholder
    if (values.length === 1) return options.find((o) => o.value === values[0])?.label ?? values[0]
    const first = options.find((o) => o.value === values[0])?.label ?? values[0]
    return `${first} +${values.length - 1}`
  })()

  function toggle(v: string, checked: boolean) {
    if (checked) onValuesChange([...values, v])
    else onValuesChange(values.filter((x) => x !== v))
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            'flex h-7 items-center justify-between gap-1.5 rounded-lg border border-input',
            'bg-transparent px-2.5 text-xs font-medium text-foreground min-w-[100px] max-w-[180px]',
            'hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            values.length === 0 && 'text-muted-foreground'
          )}
        >
          <span className="truncate">{triggerLabel}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="bottom" sideOffset={4} className="min-w-[180px] max-h-[280px] overflow-y-auto">
          {values.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => onValuesChange([])}
                className="w-full text-left px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded-sm"
              >
                Clear ({values.length})
              </button>
              <DropdownMenuSeparator />
            </>
          )}
          {options.map((o) => (
            <DropdownMenuCheckboxItem
              key={o.value}
              checked={selectedSet.has(o.value)}
              onCheckedChange={(checked) => toggle(o.value, !!checked)}
              onSelect={(e) => e.preventDefault()}
            >
              {o.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
