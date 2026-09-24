import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardNav } from '@/components/dashboard-nav'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const devBypass = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true'

  if (!devBypass) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')
  }

  return (
    <div className="min-h-dvh bg-background flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 pl-[env(safe-area-inset-left)] bg-sidebar border-r border-sidebar-border">
        <div className="flex flex-col h-full">
          <Link
            href="/dashboard"
            className="flex items-center px-5 h-14 border-b border-sidebar-border hover:bg-sidebar-accent transition-colors shrink-0"
          >
            <span className="text-sm font-semibold text-sidebar-foreground tracking-tight">
              Staff Manager
            </span>
          </Link>
          <DashboardNav />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 md:ml-64 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0 pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] pt-[env(safe-area-inset-top)] min-h-dvh">
        {children}
      </main>

      {/* Mobile bottom tab bar */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-sidebar border-t border-sidebar-border"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom)',
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)',
        }}
      >
        <DashboardNav mobile />
      </nav>
    </div>
  )
}
