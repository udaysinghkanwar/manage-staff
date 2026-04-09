# Phase 3 — Workers Section

## Status: Complete

## Context
Phases 1 and 2 are complete. 

Worker data model: name, phone, address, gender (male/female), shift (day/afternoon/night), availability_type (full-time/part-time), available_days (array, only if part-time: mon/tue/wed/thu/fri/sat/sun), status (active/inactive), notes.

A worker is "assigned" if they have a row in `job_assignments` where the related job has `status = 'open'`. Assigned workers should be visually distinct and not shown as available for new jobs.

## Tasks

### 1. `/app/dashboard/workers/page.tsx` — Worker list
- Fetch all active workers from Supabase, joined with `job_assignments` to know if assigned
- Filter bar at top (client-side after initial fetch):
  - Gender: All / Male / Female
  - Shift: All / Day / Afternoon / Night
  - Availability: All / Full-time / Part-time
  - Status: All / Available / Assigned (has active job assignment)
- Each worker card shows:
  - Name (large, prominent)
  - Phone number
  - Gender + Shift badges
  - Availability type
  - If part-time: which days
  - "Assigned" badge in amber if currently assigned to an open job
  - Tap/click → worker detail page
- "Add Worker" button — prominent, goes to `/dashboard/workers/new`
- Empty state if no workers yet

### 2. `/app/dashboard/workers/new/page.tsx` — Add worker form
- Fields:
  - Name (text, required)
  - Phone number (text, required, validate format)
  - Address (textarea)
  - Gender (radio: Male / Female)
  - Shift preference (radio: Day / Afternoon / Night)
  - Availability (radio: Full-time / Part-time)
  - If Part-time: day picker (checkboxes: Mon Tue Wed Thu Fri Sat Sun)
  - Notes (textarea, optional)
- On submit: INSERT into workers table
- On success: redirect to worker list with success toast
- Validation: name and phone required; if part-time, at least one day must be selected

### 3. `/app/dashboard/workers/[id]/page.tsx` — Worker detail + edit
- Show all worker info
- Edit button → all fields become inline-editable
- Save / Cancel buttons when in edit mode
- UPDATE worker in Supabase on save
- Worker's job history: list of jobs they were assigned to (job_assignments joined with jobs)
- Worker's broadcast history: jobs they were sent, their YES/NO response
- "Deactivate worker" button → sets status to inactive (does not delete)
- If worker currently assigned: show which job, with a link to that job

### 4. `/lib/workers.ts` — Server actions / helpers
- `getWorkers()` — fetch all with assignment status
- `getWorker(id)` — fetch single with full history
- `createWorker(data)`
- `updateWorker(id, data)`
- `deactivateWorker(id)`

## Notes
- Use shadcn/ui components
- Mobile-friendly layout, large tap targets
- Server components where possible; client only where interactivity is needed (filters, form)
