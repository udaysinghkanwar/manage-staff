'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, Briefcase, MessageSquare, LogOut } from 'lucide-react'
import { signOut } from '@/app/actions/auth'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard',         label: 'Overview', icon: LayoutDashboard, exact: true  },
  { href: '/dashboard/workers', label: 'Workers',  icon: Users,           exact: false },
  { href: '/dashboard/jobs',    label: 'Jobs',     icon: Briefcase,       exact: false },
  { href: '/dashboard/inbox',   label: 'Inbox',    icon: MessageSquare,   exact: false },
]

export function DashboardNav({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname()

  if (mobile) {
    return (
      <div className="flex items-center justify-around h-16">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 min-w-[56px] min-h-[44px] px-3 py-2 text-xs font-medium transition-colors',
                active ? 'text-sidebar-foreground' : 'text-muted-foreground hover:text-sidebar-foreground'
              )}
            >
              <Icon className={cn('h-5 w-5', active ? 'text-white' : '')} strokeWidth={active ? 2.5 : 1.75} />
              <span>{label}</span>
            </Link>
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Nav links */}
      <nav className="flex flex-col gap-0.5 px-3 py-3 flex-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[36px]',
                active
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={active ? 2.5 : 1.75} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Logout — pinned to bottom */}
      <div className="px-3 py-3 border-t border-sidebar-border shrink-0">
        <form action={signOut}>
          <button
            type="submit"
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-destructive transition-colors min-h-[36px]"
          >
            <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            Log out
          </button>
        </form>
      </div>
    </div>
  )
}
