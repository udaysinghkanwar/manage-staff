// Compact relative date: relative for the first week (so recent activity stands
// out at a glance), then a short absolute date.
export function formatRelativeDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "—";
  const days = Math.floor((Date.now() - t) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  const d = new Date(t);
  // Pin the zone: server and client must format identically or React warns
  // about a hydration mismatch.
  return d.toLocaleDateString("en-CA", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    ...(d.getFullYear() !== new Date().getFullYear() && { year: "numeric" }),
  });
}
