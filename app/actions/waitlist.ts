'use server'

import { createClient } from '@supabase/supabase-js'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type JoinWaitlistResult =
  | { ok: true }
  | { ok: false; error: string }

export async function joinWaitlist(rawEmail: string): Promise<JoinWaitlistResult> {
  const email = rawEmail.trim().toLowerCase()

  if (!EMAIL_REGEX.test(email) || email.length > 254) {
    return { ok: false, error: 'Please enter a valid email address.' }
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await supabase.from('waitlist').insert({ email })

  // 23505 = unique_violation. Treat duplicate signups as success — same UX,
  // no info leak about who's already on the list.
  if (error && error.code !== '23505') {
    console.error('waitlist insert failed', error)
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }

  return { ok: true }
}
