'use client'

import { useState } from 'react'
import { Plus, Minus } from 'lucide-react'

const FAQS = [
  {
    q: 'Do workers need to install anything?',
    a: 'No. Workers receive messages on their existing WhatsApp number. They just reply YES or NO — no app download, no account signup, no learning curve.',
  },
  {
    q: 'Is this the official WhatsApp Business API?',
    a: 'Yes. Manage Staff is built on the official WhatsApp Business Platform (Meta). All messages are compliant, reliable, and delivered through WhatsApp’s verified business infrastructure.',
  },
  {
    q: 'Do I need my own WhatsApp number?',
    a: 'On Starter and Growth plans, we provide you with a dedicated business number. On Scale, you can connect your own existing WhatsApp Business number.',
  },
  {
    q: 'What happens if a worker doesn’t reply?',
    a: 'If a worker doesn’t respond within your set window, the system automatically moves to the next available worker in your list. You can also configure auto-reminders before the deadline.',
  },
  {
    q: 'Is my worker data secure?',
    a: 'Yes. All data is encrypted in transit and at rest. We use industry-standard security practices, and your worker data is never shared with third parties. You can export or delete your data at any time.',
  },
]

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section id="faq" className="bg-muted/40 py-14 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-8 text-center sm:mb-16">
          <span className="inline-block rounded-full bg-[#e8faf1] px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[#1aab52]">
            FAQ
          </span>
          <h2 className="mt-3 text-[26px] font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Common questions
          </h2>
        </div>

        <div className="mx-auto max-w-2xl divide-y divide-border border-y border-border">
          {FAQS.map((item, i) => {
            const isOpen = open === i
            return (
              <div key={item.q}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-3 py-4 text-left text-sm font-semibold text-foreground transition-colors hover:text-foreground sm:gap-4 sm:py-5 sm:text-base"
                >
                  {item.q}
                  <span
                    className={[
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors',
                      isOpen
                        ? 'bg-[#e8faf1] text-[#1aab52]'
                        : 'bg-muted text-muted-foreground',
                    ].join(' ')}
                  >
                    {isOpen ? (
                      <Minus className="h-3.5 w-3.5" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                  </span>
                </button>
                {isOpen && (
                  <p className="pb-4 text-[13px] leading-relaxed text-muted-foreground sm:pb-5 sm:text-[15px]">
                    {item.a}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
