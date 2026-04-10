import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Users, Briefcase, CheckCircle, TrendingUp } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

async function getStats() {
  const supabase = await createClient()
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { count: totalWorkers },
    { count: assignedWorkers },
    { count: openJobs },
    { count: recentYes },
  ] = await Promise.all([
    supabase.from('workers').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('job_assignments').select('worker_id', { count: 'exact', head: true })
      .eq('jobs.status', 'open'),
    supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('job_broadcasts').select('*', { count: 'exact', head: true })
      .eq('response', 'yes').gte('responded_at', sevenDaysAgo),
  ])

  return {
    totalWorkers: totalWorkers ?? 0,
    assignedWorkers: assignedWorkers ?? 0,
    openJobs: openJobs ?? 0,
    recentYes: recentYes ?? 0,
  }
}

const STATS = [
  { key: 'totalWorkers',   label: 'Active workers',        icon: Users,        href: '/dashboard/workers' },
  { key: 'assignedWorkers',label: 'Currently assigned',    icon: CheckCircle,  href: '/dashboard/workers' },
  { key: 'openJobs',       label: 'Open jobs',             icon: Briefcase,    href: '/dashboard/jobs'    },
  { key: 'recentYes',      label: 'YES replies (7 days)',  icon: TrendingUp,   href: '/dashboard/jobs'    },
] as const

export default async function DashboardPage() {
  const stats = await getStats()

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Staff Manager dashboard</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-8">
        {STATS.map(({ key, label, icon: Icon, href }) => (
          <Link
            key={key}
            href={href}
            className="rounded-xl border bg-card p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Icon className="h-4 w-4" />
              <span className="text-xs font-medium">{label}</span>
            </div>
            <p className="text-3xl font-bold">{stats[key]}</p>
          </Link>
        ))}
      </div>

      <div className="flex gap-3">
        <Link href="/dashboard/workers" className={cn(buttonVariants(), 'flex-1 min-h-[44px]')}>
          Workers
        </Link>
        <Link href="/dashboard/jobs" className={cn(buttonVariants({ variant: 'outline' }), 'flex-1 min-h-[44px]')}>
          Jobs
        </Link>
      </div>
    </div>
  )
}
