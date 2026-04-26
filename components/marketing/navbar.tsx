import Link from 'next/link'
import { Users } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:h-15 sm:px-6 sm:py-3">
        <Link href="/" className="flex items-center gap-2 font-bold text-foreground sm:gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground text-background sm:h-8 sm:w-8">
            <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </span>
          <span className="text-sm sm:text-base">Manage Staff</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {[
            { label: 'Features', href: '#features' },
            { label: 'Pricing', href: '#pricing' },
            { label: 'FAQ', href: '#faq' },
            { label: 'Contact', href: '#contact' },
          ].map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
          >
            Sign in
          </Link>
          <Link
            href="/login"
            className={cn(
              buttonVariants({ size: 'sm' }),
              'bg-[#25D366] hover:bg-[#1aab52] text-white border-transparent'
            )}
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  )
}
