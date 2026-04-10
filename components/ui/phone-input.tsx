'use client'

import { forwardRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'> {
  value?: string
  onChange?: (formatted: string, raw: string) => void
  name?: string
}

/**
 * Auto-formatting Canadian phone input.
 * Displays: +1 (416) 555-0002
 * Emits raw digits on change for storage.
 */
export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, value = '', onChange, name, ...props }, ref) => {
    const [display, setDisplay] = useState(() => formatDisplay(value))

    function formatDisplay(raw: string): string {
      const digits = raw.replace(/\D/g, '').replace(/^1/, '').slice(0, 10)
      if (!digits) return ''
      if (digits.length <= 3) return `(${digits}`
      if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
    }

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      const raw = e.target.value.replace(/\D/g, '').replace(/^1/, '').slice(0, 10)
      const formatted = formatDisplay(raw)
      setDisplay(formatted)
      const stored = raw.length === 10 ? '1' + raw : raw
      onChange?.(formatted, stored)
    }

    return (
      <div className="flex items-center gap-0 rounded-lg border border-input bg-background focus-within:ring-2 focus-within:ring-ring overflow-hidden">
        <span className="pl-3 pr-1.5 text-sm text-muted-foreground select-none shrink-0">+1</span>
        <input
          ref={ref}
          type="tel"
          name={name}
          value={display}
          onChange={handleChange}
          placeholder="(416) 555-0002"
          className={cn(
            'flex-1 bg-transparent py-2 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none min-h-[44px]',
            className
          )}
          {...props}
        />
      </div>
    )
  }
)

PhoneInput.displayName = 'PhoneInput'
