import { ClipboardList, MessageCircle, CheckCircle } from 'lucide-react'

const STEPS = [
  {
    num: '1',
    icon: ClipboardList,
    title: 'Broadcast a job',
    desc: 'Post a job from your dashboard — location, date, pay, requirements. Choose which workers to reach.',
  },
  {
    num: '2',
    icon: MessageCircle,
    title: 'Workers reply on WhatsApp',
    desc: 'Workers get a WhatsApp message and reply YES or NO. No app install. No account creation.',
    highlight: true,
  },
  {
    num: '3',
    icon: CheckCircle,
    title: 'Auto-assign & track',
    desc: 'The system assigns available workers instantly and updates your dashboard in real time.',
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-16 text-center">
          <span className="inline-block rounded-full bg-[#e8faf1] px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[#1aab52]">
            How it works
          </span>
          <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-foreground lg:text-5xl">
            Three steps to fill every shift
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-lg text-muted-foreground">
            No training, no new apps, no confusion. Your workers already know WhatsApp.
          </p>
        </div>

        <div className="relative grid grid-cols-1 gap-12 md:grid-cols-3">
          <div className="absolute left-[16.66%] right-[16.66%] top-8 hidden h-px bg-gradient-to-r from-border via-[#25D366] to-border md:block" />

          {STEPS.map((step) => {
            const Icon = step.icon
            return (
              <div key={step.num} className="flex flex-col items-center text-center">
                <div
                  className={[
                    'relative z-10 mb-5 flex h-16 w-16 items-center justify-center rounded-full text-xl font-extrabold ring-4 ring-background',
                    step.highlight
                      ? 'bg-[#25D366] text-white shadow-[0_8px_24px_rgba(37,211,102,0.35)]'
                      : 'bg-foreground text-background',
                  ].join(' ')}
                >
                  {step.num}
                </div>
                <Icon className="mb-3 h-7 w-7 text-[#25D366]" />
                <h3 className="mb-2 text-lg font-bold text-foreground">{step.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
