"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  updateJob,
  assignWorker,
  unassignWorker,
  getBroadcasts,
} from "@/lib/jobs";
import { broadcastJob } from "@/lib/whatsapp/broadcast";
import type {
  JobDetail as JobDetailData,
  MatchedWorker,
  BroadcastRow,
} from "@/lib/jobs";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { DAY_LABELS } from "@/lib/constants";
import { DatePicker } from "@/components/ui/date-picker";
import { Counter } from "@/components/ui/counter";
import { CompanyPicker } from "@/components/ui/company-picker";
import { formatCompanyLocation } from "@/lib/company-utils";
import { formatPhone } from "@/lib/phone";
import {
  Building2,
  MapPin,
  Users,
  Radio,
  UserPlus,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ShiftType, JobType, Company } from "@/lib/types";
import { DORMANT_AFTER_DAYS } from "@/lib/types";
import { formatRelativeDate } from "@/lib/date-format";

const STATUS_STYLES: Record<string, string> = {
  open: "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400",
  filled:
    "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400",
  cancelled:
    "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400",
};

const RESPONSE_STYLES: Record<string, string> = {
  yes: "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400",
  no: "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400",
  pending: "",
};

// ─── Section A: Job Info ─────────────────────────────────────────────────────

function JobInfo({
  job,
  company: initialCompany,
  companies: initialCompanies,
  onSaved,
}: {
  job: JobDetailData["job"];
  company: Company | null;
  companies: Company[];
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(job.title);
  const [location, setLocation] = useState(job.location);
  const [jobType, setJobType] = useState<JobType>(job.job_type);
  const [shift, setShift] = useState<ShiftType | "">(job.shift ?? "");
  const [description, setDescription] = useState(job.description ?? "");
  const [jobDate, setJobDate] = useState<string | null>(job.job_date ?? null);
  const [requiredMale, setRequiredMale] = useState(job.required_male ?? 0);
  const [requiredFemale, setRequiredFemale] = useState(
    job.required_female ?? 0,
  );
  const [companies, setCompanies] = useState<Company[]>(initialCompanies);
  const [company, setCompany] = useState<Company | null>(initialCompany);

  function handleCompanyChange(next: Company | null) {
    setCompany(next);
    if (next) setLocation(formatCompanyLocation(next));
  }

  function handleCompanyCreated(next: Company) {
    setCompanies((prev) =>
      [...prev, next].sort((a, b) => a.name.localeCompare(b.name)),
    );
  }

  function cancelEdit() {
    setTitle(job.title);
    setLocation(job.location);
    setJobType(job.job_type);
    setShift(job.shift ?? "");
    setDescription(job.description ?? "");
    setJobDate(job.job_date ?? null);
    setRequiredMale(job.required_male ?? 0);
    setRequiredFemale(job.required_female ?? 0);
    setCompany(initialCompany);
    setError(null);
    setEditing(false);
  }

  function handleSave() {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!company) {
      setError("Company is required.");
      return;
    }
    if (!location.trim()) {
      setError("Location is required.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await updateJob(job.id, {
        title: title.trim(),
        location: location.trim(),
        job_type: jobType,
        shift: shift || undefined,
        description: description || undefined,
        job_date: jobType === 'on-call' ? jobDate : null,
        required_male: requiredMale,
        required_female: requiredFemale,
        company_id: company.id,
      });
      if (result?.error) {
        setError(result.error);
      } else {
        setEditing(false);
        onSaved();
        toast.success("Job updated");
      }
    });
  }

  function handleStatusChange(newStatus: "open" | "filled" | "cancelled") {
    startTransition(async () => {
      const result = await updateJob(job.id, { status: newStatus });
      if (result?.error) toast.error(result.error);
      else {
        onSaved();
        toast.success(`Job marked as ${newStatus}`);
      }
    });
  }

  return (
    <div className="rounded-xl border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Job Info</h2>
        <div className="flex items-center gap-2">
          <Badge className={cn("capitalize", STATUS_STYLES[job.status])}>
            {job.status}
          </Badge>
          {!editing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(true)}
              className="min-h-[36px]"
            >
              Edit
            </Button>
          )}
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      {editing ? (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="min-h-[44px]"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Company *</Label>
            <CompanyPicker
              companies={companies}
              value={company}
              onChange={handleCompanyChange}
              onCompanyCreated={handleCompanyCreated}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Location *</Label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="min-h-[44px]"
            />
          </div>
          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium">Job type</legend>
            <div className="flex gap-4">
              {(["on-call", "full-time"] as JobType[]).map((t) => (
                <label
                  key={t}
                  className="flex items-center gap-2 cursor-pointer min-h-[44px]"
                >
                  <input
                    type="radio"
                    checked={jobType === t}
                    onChange={() => setJobType(t)}
                    className="w-4 h-4"
                  />
                  <span className="capitalize">{t}</span>
                </label>
              ))}
            </div>
          </fieldset>
          {jobType === "on-call" && (
            <div className="space-y-1.5">
              <Label>Job date</Label>
              <DatePicker
                value={jobDate}
                onChange={setJobDate}
                placeholder="Select a date"
              />
            </div>
          )}
          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium">Shift</legend>
            <div className="flex gap-4">
              {(["day", "afternoon", "night"] as ShiftType[]).map((s) => (
                <label
                  key={s}
                  className="flex items-center gap-2 cursor-pointer min-h-[44px]"
                >
                  <input
                    type="radio"
                    checked={shift === s}
                    onChange={() => setShift(s)}
                    className="w-4 h-4"
                  />
                  <span className="capitalize">{s}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-3">
            <p className="text-sm font-medium">Workers needed</p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Male</span>
              <Counter value={requiredMale} onChange={setRequiredMale} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Female</span>
              <Counter value={requiredFemale} onChange={setRequiredFemale} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={isPending}
              className="min-h-[44px]"
            >
              {isPending ? "Saving…" : "Save"}
            </Button>
            <Button
              variant="outline"
              onClick={cancelEdit}
              disabled={isPending}
              className="min-h-[44px]"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
          {/* Row 0: Company | Address */}
          <div>
            <dt className="text-muted-foreground">Company</dt>
            <dd className="font-medium flex items-center gap-1.5 mt-0.5">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              {company ? company.name : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Address</dt>
            <dd className="font-medium mt-0.5">
              {company?.street_address || "—"}
            </dd>
          </div>

          {/* Row 1: City | Job type */}
          <div>
            <dt className="text-muted-foreground">City</dt>
            <dd className="font-medium flex items-center gap-1.5 mt-0.5">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              {job.location}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Job type</dt>
            <dd className="font-medium capitalize mt-0.5">
              {job.job_type}
            </dd>
          </div>

          {/* Row 2: Job date (on-call only) | Shift */}
          {job.job_type === "on-call" && (
            <div>
              <dt className="text-muted-foreground">Job date</dt>
              <dd className="font-medium mt-0.5">
                {job.job_date
                  ? new Date(job.job_date + "T00:00:00").toLocaleDateString(
                      "en-CA",
                      {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      },
                    )
                  : "—"}
              </dd>
            </div>
          )}
          <div>
            <dt className="text-muted-foreground">Shift</dt>
            <dd className="font-medium capitalize mt-0.5">
              {job.shift ?? "—"}
            </dd>
          </div>

          {/* Row 3: Workers needed */}
          <div>
            <dt className="text-muted-foreground">Workers needed</dt>
            <dd className="font-medium flex gap-4 mt-0.5">
              {job.required_male > 0 && <span>{job.required_male} male</span>}
              {job.required_female > 0 && (
                <span>{job.required_female} female</span>
              )}
              {!job.required_male && !job.required_female && "—"}
            </dd>
          </div>

          {/* Description — full width */}
          {job.description && (
            <div className="col-span-2">
              <dt className="text-muted-foreground">Description</dt>
              <dd className="font-medium whitespace-pre-wrap mt-0.5">
                {job.description}
              </dd>
            </div>
          )}
        </dl>
      )}

      {!editing && (
        <div className="flex gap-2 pt-2 border-t">
          {job.status === "open" && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="min-h-[36px]"
                disabled={isPending}
                onClick={() => handleStatusChange("filled")}
              >
                Mark as Filled
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="min-h-[36px]"
                disabled={isPending}
                onClick={() => handleStatusChange("cancelled")}
              >
                Cancel Job
              </Button>
            </>
          )}
          {(job.status === "filled" || job.status === "cancelled") && (
            <Button
              variant="outline"
              size="sm"
              className="min-h-[36px]"
              disabled={isPending}
              onClick={() => handleStatusChange("open")}
            >
              Reopen Job
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Section B: Matched Workers ──────────────────────────────────────────────

// One selectable worker row. Shared by the active and dormant lists so the two
// groups stay visually identical — only their placement and dimming differ.
function MatchedWorkerRow({
  w,
  checked,
  onToggle,
}: {
  w: MatchedWorker;
  checked: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-lg border p-3 transition-colors",
        checked ? "border-primary bg-primary/5" : "border-border",
        w.is_dormant && "opacity-60",
      )}
    >
      {/* 44x44 touch target per iOS guidance; the negative margin keeps the
          box's layout footprint at the checkbox's own 16px so rows don't shift. */}
      <label className="flex h-11 w-11 -m-3.5 shrink-0 cursor-pointer items-center justify-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={() => onToggle(w.id)}
          className="w-4 h-4 cursor-pointer"
        />
      </label>
      <Link
        href={`/dashboard/workers/${w.id}`}
        className="flex flex-1 items-center gap-3 min-w-0 hover:opacity-75 transition-opacity"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{w.name}</span>
            <Badge
              variant="outline"
              className={cn("text-xs py-0", {
                "border-emerald-500 text-emerald-600 dark:text-emerald-400": w.tier === 1,
                "border-blue-500 text-blue-600 dark:text-blue-400": w.tier === 2,
                "border-amber-500 text-amber-600 dark:text-amber-400": w.tier === 3,
                "border-zinc-400 text-zinc-500": w.tier === 4,
              })}
            >
              Tier {w.tier}
            </Badge>
            {w.is_new && (
              <Badge
                variant="outline"
                className="text-xs py-0 border-violet-500 text-violet-600 dark:text-violet-400"
              >
                New
              </Badge>
            )}
            {w.location_match && (
              <Badge variant="outline" className="text-xs gap-1 py-0">
                <MapPin className="h-3 w-3" /> Local
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatPhone(w.phone)}
          </p>
          {(w.city || w.main_intersection) && (
            <p className="text-xs text-muted-foreground truncate">
              {[w.city, w.main_intersection].filter(Boolean).join(" · ")}
            </p>
          )}
          {w.availability_type === "part-time" &&
          w.available_days?.length ? (
            <p className="text-xs text-muted-foreground mt-0.5">
              {w.available_days.map((d) => DAY_LABELS[d]).join(" · ")}
            </p>
          ) : null}
        </div>
        <div className="text-right shrink-0 space-y-1">
          <div className="flex flex-wrap gap-1 justify-end">
            {w.shifts?.map((s) => (
              <Badge
                key={s}
                variant="secondary"
                className="capitalize text-xs"
              >
                {s}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground capitalize">
            {w.availability_type}
          </p>
          <p className="text-xs text-muted-foreground">
            {w.has_contact ? "seen " : "joined "}
            {formatRelativeDate(w.last_seen)}
          </p>
        </div>
      </Link>
    </li>
  );
}

function MatchedWorkers({
  workers,
  jobId,
  onBroadcastSent,
}: {
  workers: MatchedWorker[];
  jobId: string;
  onBroadcastSent: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [assignConfirmOpen, setAssignConfirmOpen] = useState(false);
  const [showDormant, setShowDormant] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Already sorted dormant-last by getMatchedWorkers, so a single pass splits
  // the two groups while preserving order within each.
  const active = workers.filter((w) => !w.is_dormant);
  const dormant = workers.filter((w) => w.is_dormant);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleBroadcast() {
    startTransition(async () => {
      const result = await broadcastJob(jobId, Array.from(selected));
      setConfirmOpen(false);
      setSelected(new Set());
      if (result.failed.length > 0) {
        toast.warning(
          `Sent to ${result.sent}, failed: ${result.failed.join(", ")}`,
        );
      } else {
        toast.success(
          `Broadcast sent to ${result.sent} worker${result.sent !== 1 ? "s" : ""}`,
        );
      }
      onBroadcastSent();
    });
  }

  function handleAssignDirect() {
    startTransition(async () => {
      const ids = Array.from(selected);
      const results = await Promise.all(
        ids.map((id) => assignWorker(jobId, id)),
      );
      const assigned = results.filter((r) => !r?.error).length;
      const failed = results.length - assigned;

      setAssignConfirmOpen(false);
      setSelected(new Set());

      if (assigned > 0 && failed === 0) {
        toast.success(
          `Assigned ${assigned} worker${assigned !== 1 ? "s" : ""}`,
        );
      } else if (assigned > 0 && failed > 0) {
        toast.warning(`Assigned ${assigned}, ${failed} failed`);
      } else {
        toast.error("No workers could be assigned");
      }

      router.refresh();
    });
  }

  if (workers.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-4">
        <h2 className="font-medium mb-3">Matched Workers</h2>
        <p className="text-sm text-muted-foreground">
          No workers match this job's shift. Try changing the shift or assign a
          worker directly.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-medium">
            Matched Workers{" "}
            <span className="text-muted-foreground font-normal text-sm">
              ({active.length})
            </span>
          </h2>
          {selected.size > 0 && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAssignConfirmOpen(true)}
                className="gap-1.5 min-h-[36px]"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Assign directly ({selected.size})
              </Button>
              <Button
                size="sm"
                onClick={() => setConfirmOpen(true)}
                className="gap-1.5 min-h-[36px]"
              >
                <Radio className="h-3.5 w-3.5" />
                Broadcast ({selected.size})
              </Button>
            </div>
          )}
        </div>

        <ul className="space-y-2">
          {active.map((w) => (
            <MatchedWorkerRow
              key={w.id}
              w={w}
              checked={selected.has(w.id)}
              onToggle={toggle}
            />
          ))}
        </ul>

        {dormant.length > 0 && (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowDormant((v) => !v)}
              className="flex w-full items-center gap-1.5 rounded-lg px-1 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              {showDormant ? (
                <ChevronDown className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 shrink-0" />
              )}
              <span>
                Dormant &mdash; no contact in {DORMANT_AFTER_DAYS}+ days (
                {dormant.length})
              </span>
            </button>
            {showDormant && (
              <ul className="space-y-2 pt-1">
                {dormant.map((w) => (
                  <MatchedWorkerRow
                    key={w.id}
                    w={w}
                    checked={selected.has(w.id)}
                    onToggle={toggle}
                  />
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Confirmation dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send job broadcast?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will send a WhatsApp message to{" "}
            <strong>
              {selected.size} worker{selected.size !== 1 ? "s" : ""}
            </strong>{" "}
            with the job details and ask them to reply YES or NO.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={isPending}
              className="min-h-[44px]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleBroadcast}
              disabled={isPending}
              className="min-h-[44px]"
            >
              {isPending ? "Sending…" : "Send broadcast"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign directly confirmation */}
      <Dialog open={assignConfirmOpen} onOpenChange={setAssignConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign workers directly?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will assign{" "}
            <strong>
              {selected.size} worker{selected.size !== 1 ? "s" : ""}
            </strong>{" "}
            to this job without sending a WhatsApp broadcast.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAssignConfirmOpen(false)}
              disabled={isPending}
              className="min-h-[44px]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssignDirect}
              disabled={isPending}
              className="min-h-[44px]"
            >
              {isPending ? "Assigning…" : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Broadcast Results ────────────────────────────────────────────────────────

function BroadcastResults({
  jobId,
  initialBroadcasts,
  onAssign,
}: {
  jobId: string;
  initialBroadcasts: BroadcastRow[];
  onAssign: (workerId: string) => void;
}) {
  const [broadcasts, setBroadcasts] =
    useState<BroadcastRow[]>(initialBroadcasts);
  const [isPending, startTransition] = useTransition();

  const refetch = useCallback(async () => {
    const fresh = await getBroadcasts(jobId);
    setBroadcasts(fresh);
  }, [jobId]);

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`broadcasts:${jobId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "job_broadcasts",
          filter: `job_id=eq.${jobId}`,
        },
        () => {
          refetch();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId, refetch]);

  // Sync when parent refreshes
  useEffect(() => {
    setBroadcasts(initialBroadcasts);
  }, [initialBroadcasts]);

  if (broadcasts.length === 0) return null;

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <h2 className="font-medium">
        Broadcast Responses{" "}
        <span className="text-muted-foreground font-normal text-sm">
          ({broadcasts.length})
        </span>
      </h2>
      <ul className="space-y-2">
        {broadcasts.map((b) => (
          <li
            key={b.id}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <div className="min-w-0">
              <Link
                href={`/dashboard/workers/${b.worker.id}`}
                className="font-medium hover:underline"
              >
                {b.worker.name}
              </Link>
              <p className="text-xs text-muted-foreground">
                {formatPhone(b.worker.phone)}
              </p>
              <p className="text-xs text-muted-foreground">
                Sent{" "}
                {new Date(b.sent_at).toLocaleDateString("en-CA", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {b.responded_at &&
                  ` · Replied ${new Date(b.responded_at).toLocaleDateString("en-CA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge
                variant={b.response === "pending" ? "secondary" : undefined}
                className={cn("capitalize", RESPONSE_STYLES[b.response])}
              >
                {b.response}
              </Badge>
              {b.response === "yes" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="min-h-[36px] text-green-700 border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-700"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await assignWorker(jobId, b.worker.id);
                      if (result?.error) toast.error(result.error);
                      else {
                        toast.success(`${b.worker.name} assigned`);
                        onAssign(b.worker.id);
                      }
                    })
                  }
                >
                  Assign
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Section C: Assigned Workers ─────────────────────────────────────────────

function AssignedWorkers({
  jobId,
  assigned,
}: {
  jobId: string;
  assigned: JobDetailData["assigned"];
}) {
  const [isPending, startTransition] = useTransition();

  function handleUnassign(workerId: string, name: string) {
    startTransition(async () => {
      const result = await unassignWorker(jobId, workerId);
      if (result?.error) toast.error(result.error);
      else toast.success(`${name} unassigned`);
    });
  }

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <h2 className="font-medium flex items-center gap-2">
        <Users className="h-4 w-4" />
        Assigned Workers{" "}
        <span className="text-muted-foreground font-normal text-sm">
          ({assigned.length})
        </span>
      </h2>

      {assigned.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No workers assigned yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {assigned.map((a) => (
            <li
              key={a.assignment_id}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <div className="min-w-0">
                <Link
                  href={`/dashboard/workers/${a.worker.id}`}
                  className="font-medium hover:underline"
                >
                  {a.worker.name}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {formatPhone(a.worker.phone)} · Assigned{" "}
                  {new Date(a.assigned_at).toLocaleDateString("en-CA", {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="min-h-[36px] shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                disabled={isPending}
                onClick={() => handleUnassign(a.worker.id, a.worker.name)}
              >
                Unassign
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Root Component ───────────────────────────────────────────────────────────

export function JobDetail({
  data,
  companies,
}: {
  data: JobDetailData;
  companies: Company[];
}) {
  const [broadcasts, setBroadcasts] = useState<BroadcastRow[]>(data.broadcasts);

  async function refreshBroadcasts() {
    const fresh = await getBroadcasts(data.job.id);
    setBroadcasts(fresh);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{data.job.title}</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {data.company ? `${data.company.name} · ` : ""}
          {data.job.location}
        </p>
      </div>

      <Separator />

      <JobInfo
        job={data.job}
        company={data.company}
        companies={companies}
        onSaved={() => {}}
      />
      {data.job.status === "open" && (
        <MatchedWorkers
          workers={data.matched}
          jobId={data.job.id}
          onBroadcastSent={refreshBroadcasts}
        />
      )}
      <BroadcastResults
        jobId={data.job.id}
        initialBroadcasts={broadcasts}
        onAssign={refreshBroadcasts}
      />
      <AssignedWorkers jobId={data.job.id} assigned={data.assigned} />
    </div>
  );
}
