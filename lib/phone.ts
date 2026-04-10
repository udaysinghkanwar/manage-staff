/**
 * Format a raw phone number string to Canadian display format.
 * Input:  "14165550002" or "4165550002" or "+14165550002"
 * Output: "+1 (416) 555-0002"
 */
export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return ''
  const digits = raw.replace(/\D/g, '')

  // Strip leading country code 1 if 11 digits
  const local = digits.length === 11 && digits.startsWith('1')
    ? digits.slice(1)
    : digits

  if (local.length !== 10) return raw  // return as-is if unexpected length

  return `+1 (${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`
}

/**
 * Normalize a phone input value to storage format (digits only with country code).
 * Input:  "+1 (416) 555-0002" or "416 555 0002" etc.
 * Output: "14165550002"
 */
export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, '')
  if (digits.length === 10) return '1' + digits
  if (digits.length === 11 && digits.startsWith('1')) return digits
  return digits
}
