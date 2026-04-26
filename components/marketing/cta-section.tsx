'use client'

import { useState } from 'react'

export function CTASection() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setSent(true)
  }

  return (
    <section id="contact" className="bg-foreground py-14 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-6xl px-6 text-center">
        <h2 className="mb-3 text-[26px] font-extrabold tracking-tight text-background sm:text-4xl lg:text-5xl">
          Ready to stop chasing workers<br />on WhatsApp?
        </h2>
        <p className="mx-auto mb-7 max-w-md text-sm text-background/60 sm:mb-9 sm:text-base lg:text-lg">
          Join hundreds of teams who&apos;ve replaced group chaos with one clean dashboard.
        </p>

        {sent ? (
          <p className="text-lg font-semibold text-[#25D366]">
            You&apos;re on the list! We&apos;ll be in touch soon.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mx-auto flex max-w-md flex-col gap-2.5 sm:flex-row">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="h-12 w-full flex-1 rounded-xl border border-white/15 bg-white/10 px-4 text-base text-white placeholder:text-white/35 outline-none transition-colors focus:border-[#25D366] sm:text-sm"
            />
            <button
              type="submit"
              className="h-12 whitespace-nowrap rounded-xl bg-[#25D366] px-5 text-base font-semibold text-white transition-colors hover:bg-[#1aab52] sm:text-sm"
            >
              Get early access
            </button>
          </form>
        )}

        <p className="mt-4 text-sm text-background/35">
          Free 14-day trial · No credit card · Cancel any time
        </p>
      </div>
    </section>
  )
}
