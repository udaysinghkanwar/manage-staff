const LOGOS = ['Eventify Pro', 'SwiftCater', 'CleanCo', 'GuardForce', 'HospServ']

export function TrustBar() {
  return (
    <div className="border-y border-border py-6 sm:py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-6 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-8">
        <span className="text-xs font-medium text-muted-foreground sm:text-sm">
          Trusted by growing teams
        </span>
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
          {LOGOS.map((name) => (
            <div
              key={name}
              className="rounded-md bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground sm:px-4 sm:py-1.5 sm:text-sm"
            >
              {name}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
