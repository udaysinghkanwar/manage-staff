import type { Company } from '@/lib/types'

// Full formatted address for display in the picker dropdown.
// e.g. "123 Main St, Brampton, ON, L6T 1A1"
export function formatCompanyAddress(c: Company): string {
  return [c.street_address, c.city, c.province, c.postal_code].filter(Boolean).join(', ')
}

// Short form used for job location auto-fill and worker matching.
// e.g. "Brampton, ON"
export function formatCompanyLocation(c: Company): string {
  return [c.city, c.province].filter(Boolean).join(', ')
}
