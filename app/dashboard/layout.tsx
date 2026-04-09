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
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-56 md:flex-col md:fixed md:inset-y-0 border-r border-border bg-sidebar">
        <div className="flex flex-col h-full">
          <div className="px-4 py-5 border-b border-border">
            <h1 className="text-base font-semibold text-sidebar-foreground tracking-tight">
              Staff Manager
            </h1>
          </div>
          <DashboardNav />
        </div>
      </aside>

      {/* Main content — offset for sidebar on desktop, padded bottom for mobile tab bar */}
      <main className="flex-1 md:ml-56 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
        {children}
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-background border-t border-border"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <DashboardNav mobile />
      </nav>
    </div>
  )
}
