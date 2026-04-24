import Link from 'next/link'
import { Users } from 'lucide-react'

const COLS = [
  {
    heading: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'FAQ', href: '#faq' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'Contact', href: '#contact' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
    ],
  },
] as const

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/40 px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex flex-wrap justify-between gap-10">
          <div className="max-w-[220px]">
            <div className="mb-2 flex items-center gap-2 font-bold text-foreground">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground text-background">
                <Users className="h-3.5 w-3.5" />
              </span>
              Manage Staff
            </div>
            <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
              Coordinate casual workers through WhatsApp — from one clean dashboard.
            </p>
            <a
              href="mailto:hello@managestaff.app"
              className="text-sm font-medium text-[#1aab52]"
            >
              hello@managestaff.app
            </a>
          </div>

          {COLS.map((col) => (
            <div key={col.heading}>
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-foreground">
                {col.heading}
              </p>
              <ul className="flex flex-col gap-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Manage Staff. All rights reserved.
          </p>
          <div className="flex gap-5">
            <Link href="/privacy" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Terms
            </Link>
            <Link href="#contact" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
