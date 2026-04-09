'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, Briefcase, MessageSquare, LogOut } from 'lucide-react'
import { signOut } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard/workers', label: 'Workers', icon: Users },
  { href: '/dashboard/jobs',    label: 'Jobs',    icon: Briefcase },
  { href: '/dashboard/inbox',   label: 'Inbox',   icon: MessageSquare },
]

export function DashboardNav({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname()

  if (mobile) {
    return (
      <div className="flex items-center justify-around h-16">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 min-w-[64px] min-h-[44px] px-3 py-2 rounded-md text-xs font-medium transition-colors',
                active
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn('h-5 w-5', active && 'stroke-[2.5px]')} />
              <span>{label}</span>
            </Link>
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 px-3 py-4 gap-1 overflow-y-auto">
      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors min-h-[44px]',
                active
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <Icon className={cn('h-4 w-4 shrink-0', active && 'stroke-[2.5px]')} />
              {label}
            </Link>
          )
        })}
      </nav>

      <form action={signOut} className="mt-auto pt-4 border-t border-sidebar-border">
        <Button
          type="submit"
          variant="ghost"
          className="w-full justify-start gap-3 text-sm text-sidebar-foreground hover:text-destructive hover:bg-destructive/10 min-h-[44px]"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Log out
        </Button>
      </form>
    </div>
  )
}
