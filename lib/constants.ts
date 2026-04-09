import type { DayOfWeek } from '@/lib/types'

export const DAYS: { value: DayOfWeek; label: string }[] = [
  { value: 'mon', label: 'Mon' },
  { value: 'tue', label: 'Tue' },
  { value: 'wed', label: 'Wed' },
  { value: 'thu', label: 'Thu' },
  { value: 'fri', label: 'Fri' },
  { value: 'sat', label: 'Sat' },
  { value: 'sun', label: 'Sun' },
]

export const DAY_LABELS: Record<DayOfWeek, string> = Object.fromEntries(
  DAYS.map((d) => [d.value, d.label])
) as Record<DayOfWeek, string>
