# Phase 4 — Jobs Section & Worker Matching

## Status: Complete

## Context
Phases 1–3 are complete.

## Matching Logic
When a job is created or viewed, find matching workers using these rules:
1. Worker `status` must be `'active'`
2. Worker must NOT have an existing `job_assignments` row where the related job has `status = 'open'`
3. Worker `shift` must match the job `shift`
4. Location match: if job location text appears in worker address → exact match. If no workers match on location, return all shift-matched workers and let dad decide.

Sort: exact location match first, then others.

## Tasks

### 1. `/app/dashboard/jobs/page.tsx` — Job list
- List all jobs
- Status filter: Open / Filled / Cancelled / All
- Each job card shows: title, location, shift, safety shoes badge, status badge, number of assigned workers
- "Create Job" button
- Tap → job detail page

### 2. `/app/dashboard/jobs/new/page.tsx` — Create job form
- Fields:
  - Job title (text, required)
  - Location (text, required)
  - Shift (radio: Day / Afternoon / Night, required)
  - Work description (textarea)
  - Safety shoes required (toggle/checkbox)
- On submit: INSERT job, redirect to job detail page for that new job
- Status defaults to `'open'`

### 3. `/app/dashboard/jobs/[id]/page.tsx` — Job detail page

**Section A — Job info (editable)**
- All job fields displayed, edit button to modify
- Status control: change to Filled or Cancelled

**Section B — Matched workers (for broadcasting)**
- Run matching logic, show list of matching workers
- Each worker card shows: name, phone, shift, availability, address, "Assigned" badge if assigned
- Checkboxes to select/deselect workers for broadcast
- "Broadcast to selected" button → placeholder for Phase 5 (shows toast: "Broadcast coming in Phase 5")

**Section C — Assigned workers**
- List of workers in `job_assignments` for this job
- Each shows: name, phone, assigned date
- "Unassign" button → removes from `job_assignments`, worker becomes available again
- "Assign directly" button → modal to pick any active unassigned worker and add to `job_assignments` immediately (bypasses broadcast)

### 4. `/lib/jobs.ts` — Helpers
- `getJobs()`
- `getJob(id)`
- `createJob(data)`
- `updateJob(id, data)`
- `getMatchedWorkers(jobId)` — implements matching logic above
- `assignWorker(jobId, workerId)` — inserts to `job_assignments`
- `unassignWorker(jobId, workerId)` — removes from `job_assignments`

## Notes
- All pages mobile-friendly
- Use shadcn/ui
- Server components where possible
