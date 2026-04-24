const LOGOS = ['Eventify Pro', 'SwiftCater', 'CleanCo', 'GuardForce', 'HospServ']

export function TrustBar() {
  return (
    <div className="border-y border-border py-8">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-8 px-6">
        <span className="text-sm font-medium text-muted-foreground">Trusted by growing teams</span>
        {LOGOS.map((name) => (
          <div
            key={name}
            className="rounded-md bg-muted px-4 py-1.5 text-sm font-semibold text-muted-foreground"
          >
            {name}
          </div>
        ))}
      </div>
    </div>
  )
}
