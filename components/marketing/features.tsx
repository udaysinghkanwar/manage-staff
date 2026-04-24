import {
  MessageCircle,
  CalendarDays,
  Radio,
  CheckSquare,
  Inbox,
  Users,
} from 'lucide-react'
import { Card } from '@/components/ui/card'

const FEATURES = [
  {
    icon: MessageCircle,
    title: 'WhatsApp-native',
    desc: 'Workers need zero new tools. Respond through the WhatsApp they already use every day.',
  },
  {
    icon: CalendarDays,
    title: 'Availability tracking',
    desc: 'Know who’s free before you even send a job. Workers set their days and shifts once.',
  },
  {
    icon: Radio,
    title: 'Targeted broadcasts',
    desc: 'Send job offers only to the right workers — by skill, location, shift type, or custom group.',
  },
  {
    icon: CheckSquare,
    title: 'Auto job assignment',
    desc: 'First responders who reply YES get the job automatically. Fill shifts in minutes, not hours.',
  },
  {
    icon: Inbox,
    title: 'Message inbox',
    desc: 'See every worker conversation in one place. Full message history, no chasing through group chats.',
  },
  {
    icon: Users,
    title: 'Worker database',
    desc: 'All your workers in one searchable list — shift preference, availability, assignment history.',
  },
]

export function Features() {
  return (
    <section id="features" className="bg-muted/40 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-16 text-center">
          <span className="inline-block rounded-full bg-[#e8faf1] px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[#1aab52]">
            Features
          </span>
          <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-foreground lg:text-5xl">
            Everything you need, nothing you don&apos;t
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = f.icon
            return (
              <Card key={f.title} className="p-7 transition-shadow hover:shadow-md">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#e8faf1] text-[#1aab52]">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mb-1.5 text-base font-bold text-foreground">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
