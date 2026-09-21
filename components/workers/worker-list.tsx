"use client";

import { useState, useMemo, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { FilterDropdown, MultiFilterDropdown } from "@/components/ui/filter-dropdown";
import { Button } from "@/components/ui/button";
import {
  Users,
  Search,
  UserPlus,
  Phone,
  Calendar,
  X,
  SlidersHorizontal,
  LayoutGrid,
  List as ListIcon,
  ChevronRight,
  ChevronLeft,
  MapPin,
  MessageSquare,
  User as UserIcon,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatRelativeDate as formatAdded } from "@/lib/date-format";
import { DAY_LABELS } from "@/lib/constants";
import { formatPhone, normalizePhone } from "@/lib/phone";
import type { WorkerWithAssignment } from "@/lib/workers";
import type { DayOfWeek } from "@/lib/types";

type GenderFilter = "all" | "male" | "female";
type ShiftFilter = "all" | "day" | "afternoon" | "night";
type AvailFilter = "all" | "full-time" | "part-time";
// "Status" combines assignment state + record state. Default ('all') shows all
// active workers; 'inactive' is opt-in and shows only inactive worker records.
type StatusFilter = "all" | "available" | "assigned" | "inactive";
// Sort order. Defaults to newest-first so recently registered candidates
// surface immediately instead of being buried in an alphabetical list.
type SortKey = "recent" | "oldest" | "name";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "recent", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name", label: "Name (A–Z)" },
];

function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center text-xs font-medium px-3 py-1.5 rounded-full border transition-colors",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-transparent text-muted-foreground border-border hover:border-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}

type ViewMode = "grid" | "list";
const ROWS_PER_PAGE = 20;

// Subscribe to localStorage for the view preference. useSyncExternalStore
// keeps SSR/CSR in sync and avoids the "setState in effect" anti-pattern.
const VIEW_PREF_KEY = "workers-view-pref";
function subscribeStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}
function readViewPref(): ViewMode {
  const v = window.localStorage.getItem(VIEW_PREF_KEY);
  if (v === "grid" || v === "list") return v;
  // No saved preference — pick a sensible default for the viewport.
  // Grid cards work much better than a table on phones.
  return window.matchMedia("(max-width: 767px)").matches ? "grid" : "list";
}
function readViewPrefServer(): ViewMode {
  return "list";
}

export function WorkerList({ workers }: { workers: WorkerWithAssignment[] }) {
  const [search, setSearch] = useState("");
  const [gender, setGender] = useState<GenderFilter>("all");
  const [shift, setShift] = useState<ShiftFilter>("all");
  const [avail, setAvail] = useState<AvailFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [locationsSelected, setLocationsSelected] = useState<string[]>([]);
  const [sort, setSort] = useState<SortKey>("recent");
  const [showFilters, setShowFilters] = useState(false);
  // Subscribe to localStorage via useSyncExternalStore for SSR-safe hydration.
  const persistedView = useSyncExternalStore(
    subscribeStorage,
    readViewPref,
    readViewPrefServer,
  );
  // Allow optimistic toggling in this tab: prefer local state when set.
  const [viewOverride, setViewOverride] = useState<ViewMode | null>(null);
  const view: ViewMode = viewOverride ?? persistedView;
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<WorkerWithAssignment | null>(null);

  function changeView(next: ViewMode) {
    setViewOverride(next);
    window.localStorage.setItem(VIEW_PREF_KEY, next);
  }

  const isFiltered =
    gender !== "all" ||
    shift !== "all" ||
    avail !== "all" ||
    status !== "all" ||
    locationsSelected.length > 0;
  const activeFilterCount =
    [gender, shift, avail, status].filter((v) => v !== "all").length +
    (locationsSelected.length > 0 ? 1 : 0);

  function resetFilters() {
    setGender("all");
    setShift("all");
    setAvail("all");
    setStatus("all");
    setLocationsSelected([]);
  }

  const locations = useMemo(() => {
    const cities = new Set<string>();
    for (const w of workers) {
      if (w.city) {
        const city = w.city.split(",")[0].trim();
        if (city) cities.add(city);
      }
    }
    return Array.from(cities).sort();
  }, [workers]);

  const filtered = workers.filter((w) => {
    // Status filter — folds in both assignment state and active/inactive record state.
    // Default 'all' = all active workers. 'inactive' = only inactive workers.
    if (status === "inactive") {
      if (w.status !== "inactive") return false;
    } else {
      if (w.status !== "active") return false;
      if (status === "available" && w.is_assigned) return false;
      if (status === "assigned" && !w.is_assigned) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      if (!w.name.toLowerCase().includes(q) && !w.phone.includes(q))
        return false;
    }
    if (gender !== "all" && w.gender !== gender) return false;
    if (shift !== "all" && !w.shifts?.includes(shift)) return false;
    if (avail !== "all" && w.availability_type !== avail) return false;
    if (locationsSelected.length > 0) {
      const city = w.city?.toLowerCase() ?? "";
      const anyMatch = locationsSelected.some((loc) =>
        city.includes(loc.toLowerCase()),
      );
      if (!anyMatch) return false;
    }
    return true;
  });

  // `filtered` is a fresh array from .filter(), so sorting it in place is safe.
  // Ties fall back to name so paging stays stable for identical timestamps.
  filtered.sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name);
    const at = Date.parse(a.created_at ?? "") || 0;
    const bt = Date.parse(b.created_at ?? "") || 0;
    if (at !== bt) return sort === "recent" ? bt - at : at - bt;
    return a.name.localeCompare(b.name);
  });

  // Pagination — reset to page 1 when filters/search/view change.
  // Tracking the previous signature in state lets us reset during render
  // instead of via useEffect (React's recommended pattern).
  const filterSig = `${search}|${gender}|${shift}|${avail}|${status}|${locationsSelected.join(",")}|${sort}|${view}`;
  const [prevFilterSig, setPrevFilterSig] = useState(filterSig);
  if (filterSig !== prevFilterSig) {
    setPrevFilterSig(filterSig);
    setPage(1);
  }
  const pageSize = view === "grid" ? 24 : ROWS_PER_PAGE;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col gap-3 px-4 md:px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Workers</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {workers.length} total
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ViewToggle view={view} onChange={changeView} />
            <Link
              href="/dashboard/workers/new"
              className={cn(buttonVariants({ size: "sm" }), "gap-1.5 h-8")}
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Add Worker</span>
              <span className="sm:hidden">Add</span>
            </Link>
          </div>
        </div>

        {/* Search + filter icon (mobile) */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search workers…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 w-full text-sm"
            />
          </div>
          <button
            onClick={() => setShowFilters(true)}
            className={cn(
              "md:hidden flex items-center justify-center h-9 w-9 rounded-lg border border-input shrink-0 transition-colors",
              isFiltered
                ? "bg-primary text-primary-foreground border-primary"
                : "hover:bg-accent",
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Status chips — mobile only */}
      <div className="md:hidden flex items-center gap-2 px-4 py-3 border-b border-border overflow-x-auto">
        <span className="text-xs font-medium text-muted-foreground shrink-0">
          Status
        </span>
        <Chip active={status === "all"} onClick={() => setStatus("all")}>
          All
        </Chip>
        <Chip
          active={status === "available"}
          onClick={() => setStatus("available")}
        >
          Available
        </Chip>
        <Chip
          active={status === "assigned"}
          onClick={() => setStatus("assigned")}
        >
          Assigned
        </Chip>
        <Chip
          active={status === "inactive"}
          onClick={() => setStatus("inactive")}
        >
          Inactive
        </Chip>
      </div>

      {/* Filter strip — desktop only */}
      <div className="hidden md:flex items-end gap-3 px-6 py-3 border-b border-border flex-wrap">
        <span className="text-xs font-medium text-muted-foreground mb-1 shrink-0">
          Filters
        </span>
        <FilterDropdown
          label="Gender"
          value={gender}
          onValueChange={(v) => setGender(v as GenderFilter)}
          options={[
            { value: "all", label: "All" },
            { value: "male", label: "Male" },
            { value: "female", label: "Female" },
          ]}
        />
        <FilterDropdown
          label="Shift"
          value={shift}
          onValueChange={(v) => setShift(v as ShiftFilter)}
          options={[
            { value: "all", label: "All" },
            { value: "day", label: "Day" },
            { value: "afternoon", label: "Afternoon" },
            { value: "night", label: "Night" },
          ]}
        />
        <FilterDropdown
          label="Availability"
          value={avail}
          onValueChange={(v) => setAvail(v as AvailFilter)}
          options={[
            { value: "all", label: "All" },
            { value: "full-time", label: "Full-time" },
            { value: "part-time", label: "Part-time" },
          ]}
        />
        <FilterDropdown
          label="Status"
          value={status}
          onValueChange={(v) => setStatus(v as StatusFilter)}
          options={[
            { value: "all", label: "All" },
            { value: "available", label: "Available" },
            { value: "assigned", label: "Assigned" },
            { value: "inactive", label: "Inactive" },
          ]}
        />
        {locations.length > 0 && (
          <MultiFilterDropdown
            label="Location"
            values={locationsSelected}
            onValuesChange={setLocationsSelected}
            options={locations.map((l) => ({ value: l, label: l }))}
          />
        )}
        {/* Sort sits with the filters but is deliberately excluded from Reset —
            it's a view preference, not a filter. */}
        <div className="ml-auto">
          <FilterDropdown
            label="Sort by"
            value={sort}
            onValueChange={(v) => setSort(v as SortKey)}
            options={SORT_OPTIONS}
          />
        </div>
        {isFiltered && (
          <div className="flex flex-col gap-1">
            <span className="text-xs text-transparent select-none">
              &middot;
            </span>
            <button
              onClick={resetFilters}
              className="flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent border border-transparent hover:border-border transition-colors"
            >
              <X className="h-3 w-3" />
              Reset
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-6">
        {workers.length === 0 ? (
          <Empty
            icon={<Users className="h-8 w-8" />}
            title="No workers yet"
            description="Add your first worker to get started."
          />
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">
            No workers match the selected filters.
          </p>
        ) : view === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {pageItems.map((worker) => (
              <WorkerCard
                key={worker.id}
                worker={worker}
                selected={selected?.id === worker.id}
                onSelect={setSelected}
              />
            ))}
          </div>
        ) : (
          <WorkerListView
            workers={pageItems}
            selectedId={selected?.id ?? null}
            onSelect={setSelected}
          />
        )}

        {filtered.length > 0 && (
          <Pagination
            page={safePage}
            pages={totalPages}
            total={filtered.length}
            shown={pageItems.length}
            onPage={setPage}
          />
        )}
      </div>

      {/* Slide-in preview panel */}
      <WorkerPreviewPanel worker={selected} onClose={() => setSelected(null)} />

      {/* Filter bottom sheet — mobile only */}
      {showFilters && (
        <div className="md:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowFilters(false)}
          />
          {/* Sheet */}
          <div className="absolute bottom-0 left-0 right-0 bg-card border-t border-border rounded-t-2xl max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            <div className="flex items-center justify-between px-5 pb-4 pt-2">
              <h2 className="text-lg font-semibold">Filters</h2>
              <button
                onClick={() => setShowFilters(false)}
                className="p-1 rounded-full hover:bg-accent"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            <div className="px-5 pb-24 space-y-5">
              {/* Sort */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Sort by
                </p>
                <div className="flex flex-wrap gap-2">
                  {SORT_OPTIONS.map((o) => (
                    <Chip
                      key={o.value}
                      active={sort === o.value}
                      onClick={() => setSort(o.value)}
                    >
                      {o.label}
                    </Chip>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Status
                </p>
                <div className="flex flex-wrap gap-2">
                  <Chip
                    active={status === "all"}
                    onClick={() => setStatus("all")}
                  >
                    All
                  </Chip>
                  <Chip
                    active={status === "available"}
                    onClick={() => setStatus("available")}
                  >
                    Available
                  </Chip>
                  <Chip
                    active={status === "assigned"}
                    onClick={() => setStatus("assigned")}
                  >
                    Assigned
                  </Chip>
                  <Chip
                    active={status === "inactive"}
                    onClick={() => setStatus("inactive")}
                  >
                    Inactive
                  </Chip>
                </div>
              </div>

              {/* Shift */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Shift
                </p>
                <div className="flex flex-wrap gap-2">
                  <Chip
                    active={shift === "all"}
                    onClick={() => setShift("all")}
                  >
                    All
                  </Chip>
                  <Chip
                    active={shift === "day"}
                    onClick={() => setShift("day")}
                  >
                    Day
                  </Chip>
                  <Chip
                    active={shift === "afternoon"}
                    onClick={() => setShift("afternoon")}
                  >
                    Afternoon
                  </Chip>
                  <Chip
                    active={shift === "night"}
                    onClick={() => setShift("night")}
                  >
                    Night
                  </Chip>
                </div>
              </div>

              {/* Gender */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Gender
                </p>
                <div className="flex flex-wrap gap-2">
                  <Chip
                    active={gender === "all"}
                    onClick={() => setGender("all")}
                  >
                    All
                  </Chip>
                  <Chip
                    active={gender === "male"}
                    onClick={() => setGender("male")}
                  >
                    Male
                  </Chip>
                  <Chip
                    active={gender === "female"}
                    onClick={() => setGender("female")}
                  >
                    Female
                  </Chip>
                </div>
              </div>

              {/* Availability */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Availability
                </p>
                <div className="flex flex-wrap gap-2">
                  <Chip
                    active={avail === "all"}
                    onClick={() => setAvail("all")}
                  >
                    All
                  </Chip>
                  <Chip
                    active={avail === "full-time"}
                    onClick={() => setAvail("full-time")}
                  >
                    Full-Time
                  </Chip>
                  <Chip
                    active={avail === "part-time"}
                    onClick={() => setAvail("part-time")}
                  >
                    Part-Time
                  </Chip>
                </div>
              </div>

              {/* Reset */}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  resetFilters();
                  setShowFilters(false);
                }}
              >
                Reset all filters
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Worker Card ─────────────────────────────────────────────────────────────

function WorkerCard({
  worker,
  selected,
  onSelect,
}: {
  worker: WorkerWithAssignment;
  selected: boolean;
  onSelect: (w: WorkerWithAssignment) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(worker)}
      className={cn(
        "group block text-left w-full rounded-xl bg-card border border-border p-3 md:p-4 transition-all hover:bg-accent overflow-hidden",
        worker.is_assigned && "border-amber-500/30 hover:border-amber-500/50",
        selected && "ring-1 ring-primary border-primary/60",
      )}
    >
      {/* Top row: name + status */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="font-semibold text-card-foreground text-sm leading-snug">
          {worker.name}
        </p>
        <StatusPill status={workerStatusLabel(worker)} />
      </div>

      {/* Phone + registration date */}
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground mb-3">
        <span className="flex items-center gap-1.5 min-w-0">
          <Phone className="h-3 w-3 shrink-0" />
          <span className="truncate">{formatPhone(worker.phone)}</span>
        </span>
        <span className="shrink-0">{formatAdded(worker.created_at)}</span>
      </div>

      {/* Chips */}
      <div className="flex flex-wrap gap-1.5">
        {worker.gender && <CoffeeChip>{worker.gender}</CoffeeChip>}
        {worker.shifts?.map((s) => (
          <CoffeeChip key={s}>{s}</CoffeeChip>
        ))}
        {worker.availability_type && (
          <CoffeeChip>
            {worker.availability_type === "full-time"
              ? "Full-Time"
              : "Part-Time"}
          </CoffeeChip>
        )}
      </div>

      {/* Days */}
      {worker.available_days?.length ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2.5">
          <Calendar className="h-3 w-3 shrink-0" />
          {worker.available_days.map((d) => DAY_LABELS[d] ?? d).join(" · ")}
        </p>
      ) : null}
    </button>
  );
}

function CoffeeChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground border border-border capitalize">
      {children}
    </span>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Empty({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-muted-foreground mb-4">{icon}</div>
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </div>
  );
}

// ─── View toggle ─────────────────────────────────────────────────────────────

function ViewToggle({
  view,
  onChange,
}: {
  view: ViewMode;
  onChange: (v: ViewMode) => void;
}) {
  return (
    <div
      className="inline-flex items-center rounded-lg border border-input bg-background p-0.5 h-8"
      role="tablist"
      aria-label="View"
    >
      <button
        type="button"
        role="tab"
        aria-selected={view === "grid"}
        onClick={() => onChange("grid")}
        className={cn(
          "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium transition-colors",
          view === "grid"
            ? "bg-accent text-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Grid</span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={view === "list"}
        onClick={() => onChange("list")}
        className={cn(
          "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium transition-colors",
          view === "list"
            ? "bg-accent text-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <ListIcon className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">List</span>
      </button>
    </div>
  );
}

// ─── Status, days, avatar atoms ──────────────────────────────────────────────

type WorkerStatusLabel = "Available" | "Assigned" | "Inactive";

function workerStatusLabel(w: WorkerWithAssignment): WorkerStatusLabel {
  if (w.status === "inactive") return "Inactive";
  return w.is_assigned ? "Assigned" : "Available";
}

function StatusPill({ status }: { status: WorkerStatusLabel }) {
  const styles =
    status === "Available"
      ? "border-emerald-600/60 text-emerald-400"
      : status === "Assigned"
        ? "border-amber-600/60 text-amber-400"
        : "border-border text-muted-foreground";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full border",
        styles,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

const DAY_ORDER: DayOfWeek[] = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
];
const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

function daysBitmap(available: DayOfWeek[] | null | undefined): boolean[] {
  if (!available?.length)
    return [false, false, false, false, false, false, false];
  const set = new Set(available);
  return DAY_ORDER.map((d) => set.has(d));
}

function DayCells({ days }: { days: boolean[] }) {
  return (
    <span
      className="inline-flex gap-0.5"
      title={days
        .map((on, i) => (on ? DAY_LETTERS[i] : null))
        .filter(Boolean)
        .join(" ")}
    >
      {days.map((on, i) => (
        <span
          key={i}
          className={cn(
            "inline-flex items-center justify-center w-[19px] h-[19px] rounded-[5px] text-[0.62rem] font-semibold border",
            on
              ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
              : "bg-muted/40 border-border text-muted-foreground/50",
          )}
        >
          {DAY_LETTERS[i]}
        </span>
      ))}
    </span>
  );
}

const AVATAR_HUES = [28, 45, 80, 150, 200, 260, 330];

function nameHueIndex(name: string): number {
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return sum % AVATAR_HUES.length;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

function Avatar({ name, size = 34 }: { name: string; size?: number }) {
  const hue = AVATAR_HUES[nameHueIndex(name)];
  return (
    <span
      aria-hidden
      className="inline-flex items-center justify-center rounded-full font-semibold shrink-0 select-none"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: `oklch(0.32 0.035 ${hue})`,
        color: `oklch(0.85 0.06 ${hue})`,
      }}
    >
      {initials(name)}
    </span>
  );
}

function formatTypeLabel(t: string | null | undefined): string {
  return t === "full-time"
    ? "Full-Time"
    : t === "part-time"
      ? "Part-Time"
      : "—";
}

// ─── List (table) view ──────────────────────────────────────────────────────

function WorkerListView({
  workers,
  selectedId,
  onSelect,
}: {
  workers: WorkerWithAssignment[];
  selectedId: string | null;
  onSelect: (w: WorkerWithAssignment) => void;
}) {
  const TH =
    "text-left text-[0.74rem] font-semibold uppercase tracking-wider text-muted-foreground/80 px-4 py-3 border-b border-border";
  return (
    <>
      {/* Mobile: stacked rows (no table) */}
      <div className="md:hidden overflow-hidden rounded-xl border border-border bg-card divide-y divide-border">
        {workers.map((w) => (
          <MobileWorkerRow
            key={w.id}
            worker={w}
            selected={selectedId === w.id}
            onSelect={onSelect}
          />
        ))}
      </div>

      {/* Desktop: full table */}
      <div className="hidden md:block overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted/30">
                <th className={cn(TH, "min-w-[220px]")}>Worker</th>
                <th className={cn(TH, "max-[1360px]:hidden")}>Gender</th>
                <th className={cn(TH, "max-[1040px]:hidden")}>Shift</th>
                <th className={cn(TH, "max-[1180px]:hidden")}>Type</th>
                <th className={cn(TH, "max-[880px]:hidden")}>Days</th>
                <th className={TH}>Location</th>
                <th className={cn(TH, "max-[1260px]:hidden")}>Added</th>
                <th className={TH}>Status</th>
                <th className="w-9 border-b border-border" />
              </tr>
            </thead>
            <tbody>
              {workers.map((w) => (
                <WorkerRow
                  key={w.id}
                  worker={w}
                  selected={selectedId === w.id}
                  onSelect={onSelect}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function MobileWorkerRow({
  worker,
  selected,
  onSelect,
}: {
  worker: WorkerWithAssignment;
  selected: boolean;
  onSelect: (w: WorkerWithAssignment) => void;
}) {
  const status = workerStatusLabel(worker);
  const locationLine = [worker.city, worker.main_intersection]
    .filter(Boolean)
    .join(" · ");

  return (
    <button
      type="button"
      onClick={() => onSelect(worker)}
      className={cn(
        "flex items-start gap-3 w-full text-left px-3 py-3 transition-colors",
        selected ? "bg-accent/70" : "active:bg-accent/40",
      )}
    >
      <Avatar name={worker.name} size={36} />
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold truncate">{worker.name}</span>
          <StatusPill status={status} />
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatPhone(worker.phone)}
          </span>
          <span className="text-xs text-muted-foreground shrink-0">
            {formatAdded(worker.created_at)}
          </span>
        </div>
        {locationLine && (
          <span className="text-xs text-muted-foreground truncate">
            {locationLine}
          </span>
        )}
      </div>
    </button>
  );
}

function WorkerRow({
  worker,
  selected,
  onSelect,
}: {
  worker: WorkerWithAssignment;
  selected: boolean;
  onSelect: (w: WorkerWithAssignment) => void;
}) {
  const days = daysBitmap(worker.available_days);
  const status = workerStatusLabel(worker);

  return (
    <tr
      role="button"
      tabIndex={0}
      onClick={() => onSelect(worker)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(worker);
        }
      }}
      className={cn(
        "cursor-pointer transition-colors border-b border-border last:border-b-0",
        selected ? "bg-accent/70" : "hover:bg-accent/40",
      )}
    >
      <td className="px-4 py-3 align-middle">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={worker.name} size={34} />
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold leading-tight truncate">
              {worker.name}
            </span>
            <span className="text-xs text-muted-foreground tabular-nums truncate">
              {formatPhone(worker.phone)}
            </span>
          </div>
        </div>
      </td>
      <td className="max-[1360px]:hidden px-4 py-3 align-middle text-sm text-muted-foreground capitalize">
        {worker.gender ?? "—"}
      </td>
      <td className="max-[1040px]:hidden px-4 py-3 align-middle">
        <div className="flex flex-wrap gap-1">
          {worker.shifts?.length ? (
            worker.shifts.map((s) => <CoffeeChip key={s}>{s}</CoffeeChip>)
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          )}
        </div>
      </td>
      <td className="max-[1180px]:hidden px-4 py-3 align-middle text-sm text-muted-foreground">
        {formatTypeLabel(worker.availability_type)}
      </td>
      <td className="max-[880px]:hidden px-4 py-3 align-middle">
        <DayCells days={days} />
      </td>
      <td className="px-4 py-3 align-middle whitespace-nowrap">
        <div className="flex flex-col leading-tight">
          <span className="text-sm">{worker.city ?? "—"}</span>
          {worker.main_intersection && (
            <span className="text-xs text-muted-foreground">
              {worker.main_intersection}
            </span>
          )}
        </div>
      </td>
      <td className="max-[1260px]:hidden px-4 py-3 align-middle text-sm text-muted-foreground whitespace-nowrap">
        {formatAdded(worker.created_at)}
      </td>
      <td className="px-4 py-3 align-middle">
        <StatusPill status={status} />
      </td>
      <td className="px-3 py-3 align-middle text-right text-muted-foreground/60">
        <ChevronRight className="h-4 w-4 ml-auto" />
      </td>
    </tr>
  );
}

// ─── Pagination ──────────────────────────────────────────────────────────────

function Pagination({
  page,
  pages,
  total,
  shown,
  onPage,
}: {
  page: number;
  pages: number;
  total: number;
  shown: number;
  onPage: (n: number) => void;
}) {
  if (pages <= 1) {
    return (
      <div className="flex items-center justify-between pt-4">
        <span className="text-xs text-muted-foreground">
          {total} worker{total === 1 ? "" : "s"}
        </span>
      </div>
    );
  }

  // Smart page-number compression: always show first, last, current ± 1.
  const items: Array<number | "gap"> = [];
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - page) <= 1) {
      items.push(i);
    } else if (items[items.length - 1] !== "gap") {
      items.push("gap");
    }
  }

  return (
    <div className="flex items-center justify-between pt-4 gap-4">
      <span className="text-xs text-muted-foreground">
        {shown} of {total} workers
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page === 1}
          onClick={() => onPage(page - 1)}
          aria-label="Previous page"
          className="inline-flex items-center justify-center min-w-8 h-8 px-1.5 rounded-md border border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-35 disabled:hover:bg-background disabled:hover:text-muted-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {items.map((it, i) =>
          it === "gap" ? (
            <span
              key={`gap-${i}`}
              className="px-1.5 text-xs text-muted-foreground"
            >
              …
            </span>
          ) : (
            <button
              key={it}
              type="button"
              onClick={() => onPage(it)}
              className={cn(
                "inline-flex items-center justify-center min-w-8 h-8 px-2 rounded-md border text-xs font-medium transition-colors",
                it === page
                  ? "bg-primary text-primary-foreground border-transparent"
                  : "bg-background border-border text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {it}
            </button>
          ),
        )}
        <button
          type="button"
          disabled={page === pages}
          onClick={() => onPage(page + 1)}
          aria-label="Next page"
          className="inline-flex items-center justify-center min-w-8 h-8 px-1.5 rounded-md border border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-35 disabled:hover:bg-background disabled:hover:text-muted-foreground"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Slide-in preview panel ──────────────────────────────────────────────────

function WorkerPreviewPanel({
  worker,
  onClose,
}: {
  worker: WorkerWithAssignment | null;
  onClose: () => void;
}) {
  const open = !!worker;
  // Keep the last worker around during the close animation so content doesn't disappear mid-slide.
  // Tracking via render-time prev-comparison avoids a setState-in-effect.
  const [last, setLast] = useState<WorkerWithAssignment | null>(worker);
  const [prevWorker, setPrevWorker] = useState<WorkerWithAssignment | null>(
    worker,
  );
  if (worker !== prevWorker) {
    setPrevWorker(worker);
    if (worker) setLast(worker);
  }

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const w = worker ?? last;
  const status = w ? workerStatusLabel(w) : null;
  const days = w ? daysBitmap(w.available_days) : [];
  const waPhone = w ? normalizePhone(w.phone).replace(/^\+/, "") : "";
  const joined = w?.created_at
    ? new Date(w.created_at).toLocaleDateString("en-CA", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";

  return (
    <>
      {/* Scrim */}
      <div
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-black/45 transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
      />
      {/* Panel */}
      <aside
        aria-hidden={!open}
        className={cn(
          "fixed top-0 right-0 bottom-0 z-50 w-[400px] max-w-[92vw] bg-card border-l border-border overflow-y-auto shadow-2xl flex flex-col",
          "transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        {w && status && (
          <>
            {/* Header */}
            <div className="flex items-start gap-3 px-6 pt-6">
              <Avatar name={w.name} size={52} />
              <div className="flex-1 flex flex-col gap-1 min-w-0">
                <h2 className="text-lg font-semibold leading-tight truncate">
                  {w.name}
                </h2>
                {joined && (
                  <p className="text-xs text-muted-foreground">
                    Added {joined}
                  </p>
                )}
                <div className="flex items-center gap-1.5 mt-1.5">
                  <StatusPill status={status} />
                  <a
                    href={`tel:${normalizePhone(w.phone)}`}
                    aria-label="Call"
                    title="Call"
                    className="inline-flex items-center justify-center h-7 w-7 rounded-md border border-border text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <Phone className="h-3.5 w-3.5" />
                  </a>
                  <a
                    href={`https://wa.me/${waPhone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Message on WhatsApp"
                    title="Message on WhatsApp"
                    className="inline-flex items-center justify-center h-7 w-7 rounded-md border border-border text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body — phone + location, work-profile chips, availability strip */}
            <div className="flex-1 px-6 pb-6">
              <Section title="Contact">
                <Field icon={<Phone className="h-3.5 w-3.5 opacity-60" />}>
                  <span className="tabular-nums">{formatPhone(w.phone)}</span>
                </Field>
                {(w.city || w.main_intersection) && (
                  <Field icon={<MapPin className="h-3.5 w-3.5 opacity-60" />}>
                    <span>
                      {w.city ?? ""}
                      {w.main_intersection && (
                        <span className="block text-xs text-muted-foreground mt-0.5">
                          {w.main_intersection}
                        </span>
                      )}
                    </span>
                  </Field>
                )}
              </Section>

              <Section title="Work profile">
                <div className="flex flex-wrap gap-1.5">
                  {w.gender && <CoffeeChip>{w.gender}</CoffeeChip>}
                  {w.shifts?.map((s) => (
                    <CoffeeChip key={s}>{s}</CoffeeChip>
                  ))}
                  {w.availability_type && (
                    <CoffeeChip>
                      {formatTypeLabel(w.availability_type)}
                    </CoffeeChip>
                  )}
                </div>
              </Section>

              <Section title="Availability">
                <div className="grid grid-cols-7 gap-1">
                  {days.map((on, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex flex-col items-center gap-1 py-2 rounded-md border",
                        on
                          ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                          : "bg-muted/40 border-border text-muted-foreground/50",
                      )}
                    >
                      <span className="text-[0.6rem] font-semibold uppercase tracking-wider">
                        {DAY_LETTERS[i]}
                      </span>
                      <span className="text-xs font-semibold">
                        {on ? "✓" : "–"}
                      </span>
                    </div>
                  ))}
                </div>
              </Section>
            </div>

            {/* Sticky CTA — the panel is a preview; the page is the workspace. */}
            <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4">
              <Link
                href={`/dashboard/workers/${w.id}`}
                className={cn(buttonVariants(), "w-full gap-1.5")}
              >
                <UserIcon className="h-4 w-4" /> Open full profile
              </Link>
            </div>
          </>
        )}
      </aside>
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-6">
      <h3 className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Field({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5 py-1.5 text-sm">
      <span className="mt-0.5">{icon}</span>
      <span>{children}</span>
    </div>
  );
}

