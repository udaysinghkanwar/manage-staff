"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  updateWorker,
  deactivateWorker,
  reactivateWorker,
} from "@/lib/workers";
import { CityPicker } from "@/components/ui/city-picker";
import { getJobs, assignWorker } from "@/lib/jobs";
import type { WorkerHistory } from "@/lib/workers";
import type { JobWithCount } from "@/lib/jobs";
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
import type {
  DayOfWeek,
  ShiftType,
  AvailabilityType,
  WorkerGender,
} from "@/lib/types";
import { DAYS, DAY_LABELS } from "@/lib/constants";
import { PhoneInput } from "@/components/ui/phone-input";
import { formatPhone, normalizePhone } from "@/lib/phone";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function WorkerDetail({ data }: { data: WorkerHistory }) {
  const { worker, assignments, broadcasts } = data;
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Edit state mirrors worker fields
  const [name, setName] = useState(worker.name);
  const [phone, setPhone] = useState(worker.phone);
  const [city, setCity] = useState(worker.city ?? "");
  const [age, setAge] = useState<string>(worker.age != null ? String(worker.age) : "");
  const [gender, setGender] = useState<WorkerGender | "">(worker.gender ?? "");
  const [shift, setShift] = useState<ShiftType | "">(worker.shift ?? "");
  const [availType, setAvailType] = useState<AvailabilityType | "">(
    worker.availability_type ?? "",
  );
  const [availDays, setAvailDays] = useState<DayOfWeek[]>(
    worker.available_days ?? [],
  );
  const [notes, setNotes] = useState(worker.notes ?? "");

  function cancelEdit() {
    setName(worker.name);
    setPhone(worker.phone);
    setCity(worker.city ?? "");
    setAge(worker.age != null ? String(worker.age) : "");
    setGender(worker.gender ?? "");
    setShift(worker.shift ?? "");
    setAvailType(worker.availability_type ?? "");
    setAvailDays(worker.available_days ?? []);
    setNotes(worker.notes ?? "");
    setError(null);
    setEditing(false);
  }

  function toggleDay(day: DayOfWeek) {
    setAvailDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  }

  function handleSave() {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!phone.trim() || phone.replace(/\D/g, "").length < 10) {
      setError("Enter a valid phone number.");
      return;
    }
    if (availType === "part-time" && availDays.length === 0) {
      setError("Select at least one available day.");
      return;
    }
    let ageValue: number | null = null;
    if (age.trim()) {
      const n = Number(age);
      if (!Number.isInteger(n) || n < 18 || n >= 120) {
        setError("Workers must be at least 18 years old.");
        return;
      }
      ageValue = n;
    }
    setError(null);
    startTransition(async () => {
      const result = await updateWorker(worker.id, {
        name: name.trim(),
        phone: phone.trim(),
        city: city || undefined,
        age: ageValue,
        gender: gender || undefined,
        shift: shift || undefined,
        availability_type: availType || undefined,
        available_days: availType === "part-time" ? availDays : [],
        notes: notes || undefined,
      });
      if (result?.error) {
        setError(result.error);
      } else {
        setEditing(false);
      }
    });
  }

  // Assign to job dialog
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [openJobs, setOpenJobs] = useState<JobWithCount[]>([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [loadingJobs, setLoadingJobs] = useState(false);

  async function openAssignDialog() {
    setLoadingJobs(true);
    setAssignDialogOpen(true);
    const jobs = await getJobs();
    setOpenJobs(jobs.filter((j) => j.status === "open"));
    setLoadingJobs(false);
  }

  function handleAssign() {
    if (!selectedJobId) return;
    startTransition(async () => {
      const result = await assignWorker(selectedJobId, worker.id);
      if (result?.error) {
        toast.error(result.error);
      } else {
        setAssignDialogOpen(false);
        setSelectedJobId("");
        toast.success("Worker assigned to job");
      }
    });
  }

  // Find active assignment from assignments list
  const activeAssignment = assignments.find((a) => a.job.status === "open");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{worker.name}</h1>
          <p className="text-muted-foreground">{formatPhone(worker.phone)}</p>
        </div>
        <div className="flex items-center gap-2">
          {worker.status === "inactive" && (
            <>
              <Badge variant="secondary">Inactive</Badge>
              <Button
                variant="outline"
                size="sm"
                className="min-h-[36px]"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await reactivateWorker(worker.id);
                    if (result?.error) toast.error(result.error);
                    else toast.success(`${worker.name} reactivated`);
                  })
                }
              >
                Reactivate
              </Button>
            </>
          )}
          {activeAssignment && (
            <Badge className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400">
              Assigned
            </Badge>
          )}
        </div>
      </div>

      {activeAssignment && (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm">
          Currently assigned to{" "}
          <Link
            href={`/dashboard/jobs/${activeAssignment.job.id}`}
            className="font-medium underline underline-offset-2"
          >
            {activeAssignment.job.title}
          </Link>
        </div>
      )}

      {/* Worker info */}
      <div className="rounded-xl border bg-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Worker Info</h2>
          {!editing && worker.status === "active" && (
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

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        {editing ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="min-h-[44px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Phone *</Label>
              <PhoneInput
                value={normalizePhone(phone)}
                onChange={(_fmt, raw) => setPhone(raw)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>City</Label>
              <CityPicker value={city} onChange={setCity} />
            </div>
            <div className="space-y-1.5">
              <Label>Age</Label>
              <Input
                type="number"
                inputMode="numeric"
                min={18}
                max={119}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className={`min-h-[44px] ${
                  age.trim() !== "" && Number(age) > 0 && Number(age) < 18
                    ? "ring-2 ring-destructive"
                    : ""
                }`}
              />
              {age.trim() !== "" && Number(age) > 0 && Number(age) < 18 && (
                <p className="text-xs text-destructive">
                  Workers must be at least 18 years old.
                </p>
              )}
            </div>
            <fieldset className="space-y-1.5">
              <legend className="text-sm font-medium">Gender</legend>
              <div className="flex gap-4">
                {(["male", "female"] as WorkerGender[]).map((g) => (
                  <label
                    key={g}
                    className="flex items-center gap-2 cursor-pointer min-h-[44px]"
                  >
                    <input
                      type="radio"
                      checked={gender === g}
                      onChange={() => setGender(g)}
                      className="w-4 h-4"
                    />
                    <span className="capitalize">{g}</span>
                  </label>
                ))}
              </div>
            </fieldset>
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
            <fieldset className="space-y-1.5">
              <legend className="text-sm font-medium">Availability</legend>
              <div className="flex gap-4">
                {(["full-time", "part-time"] as AvailabilityType[]).map((a) => (
                  <label
                    key={a}
                    className="flex items-center gap-2 cursor-pointer min-h-[44px]"
                  >
                    <input
                      type="radio"
                      checked={availType === a}
                      onChange={() => setAvailType(a)}
                      className="w-4 h-4"
                    />
                    <span className="capitalize">{a}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            {availType === "part-time" && (
              <div className="flex flex-wrap gap-2">
                {DAYS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleDay(value)}
                    className={`px-3 py-2 rounded-md border text-sm font-medium min-h-[44px] transition-colors ${
                      availDays.includes(value)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border hover:bg-muted"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex gap-2 pt-1">
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
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Age</dt>
              <dd className="font-medium">{worker.age ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Gender</dt>
              <dd className="font-medium capitalize">{worker.gender ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Shift</dt>
              <dd className="font-medium capitalize">{worker.shift ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Availability</dt>
              <dd className="font-medium capitalize">
                {worker.availability_type ?? "—"}
              </dd>
            </div>
            {worker.availability_type === "part-time" && (
              <div>
                <dt className="text-muted-foreground">Days</dt>
                <dd className="font-medium">
                  {worker.available_days
                    ?.map((d) => DAY_LABELS[d] ?? d)
                    .join(", ") ?? "—"}
                </dd>
              </div>
            )}
            <div className="col-span-2">
              <dt className="text-muted-foreground">City</dt>
              <dd className="font-medium">{worker.city ?? "—"}</dd>
            </div>
            {worker.notes && (
              <div className="col-span-2">
                <dt className="text-muted-foreground">Notes</dt>
                <dd className="font-medium">{worker.notes}</dd>
              </div>
            )}
            <div>
              <dt className="text-muted-foreground">Added</dt>
              <dd className="font-medium">{formatDate(worker.created_at)}</dd>
            </div>
          </dl>
        )}
      </div>

      {/* Assign to job */}
      {worker.status === "active" && !activeAssignment && (
        <>
          <Button
            variant="outline"
            className="w-full min-h-[44px]"
            onClick={openAssignDialog}
          >
            Assign to job
          </Button>
          <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign to open job</DialogTitle>
              </DialogHeader>
              {loadingJobs ? (
                <p className="text-sm text-muted-foreground py-2">
                  Loading jobs…
                </p>
              ) : openJobs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  No open jobs available.
                </p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {openJobs.map((j) => (
                    <label
                      key={j.id}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                        selectedJobId === j.id
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/50",
                      )}
                    >
                      <input
                        type="radio"
                        name="assign-job"
                        value={j.id}
                        checked={selectedJobId === j.id}
                        onChange={() => setSelectedJobId(j.id)}
                        className="w-4 h-4"
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{j.title}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {j.location} · {j.shift ?? "any shift"} ·{" "}
                          {j.assigned_count} assigned
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
              <DialogFooter>
                <Button
                  onClick={handleAssign}
                  disabled={!selectedJobId || isPending || loadingJobs}
                  className="min-h-[44px]"
                >
                  {isPending ? "Assigning…" : "Assign"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}

      {/* Job history */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <h2 className="font-medium">Job History</h2>
        {assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No job assignments yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {assignments.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between text-sm gap-4"
              >
                <div className="min-w-0">
                  <Link
                    href={`/dashboard/jobs/${a.job.id}`}
                    className="font-medium hover:underline truncate block"
                  >
                    {a.job.title}
                  </Link>
                  <p className="text-muted-foreground text-xs">
                    {a.job.location} · {formatDate(a.assigned_at)}
                  </p>
                </div>
                <Badge
                  variant={a.job.status === "open" ? "default" : "secondary"}
                  className="capitalize shrink-0"
                >
                  {a.job.status}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Broadcast history */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <h2 className="font-medium">Broadcast History</h2>
        {broadcasts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No broadcasts sent yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {broadcasts.map((b) => (
              <li
                key={b.id}
                className="flex items-center justify-between text-sm gap-4"
              >
                <div className="min-w-0">
                  <Link
                    href={`/dashboard/jobs/${b.job.id}`}
                    className="font-medium hover:underline truncate block"
                  >
                    {b.job.title}
                  </Link>
                  <p className="text-muted-foreground text-xs">
                    {formatDate(b.sent_at)}
                  </p>
                </div>
                <Badge
                  className={
                    b.response === "yes"
                      ? "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400"
                      : b.response === "no"
                        ? "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400"
                        : ""
                  }
                  variant={b.response === "pending" ? "secondary" : undefined}
                >
                  {b.response.charAt(0).toUpperCase() + b.response.slice(1)}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Danger zone */}
      {worker.status === "active" && (
        <>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Deactivate worker</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Removes them from availability. Does not delete their history.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              className="min-h-[44px]"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  await deactivateWorker(worker.id);
                })
              }
            >
              Deactivate
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
