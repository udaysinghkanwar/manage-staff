# Phase 2 — Authentication Flow

## Status: Pending

## Context
Phase 1 is complete. Single shared account — one email, two people (owner and son) share it. Magic link only, no password.

## Tasks

### 1. `/app/login/page.tsx`
- Clean, responsive page — works on mobile and desktop
- Single email input field
- "Send login link" button
- On submit: `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: origin/auth/callback } })`
- Success state: "Check your email for a login link"
- Error state if something goes wrong
- No sign up option — login only
- Simple, large inputs, easy to use on mobile

### 2. `/app/auth/callback/route.ts`
- Handles the magic link redirect
- Exchanges the code for a session
- Redirects to `/dashboard` on success
- Redirects to `/login?error=true` on failure

### 3. `/app/dashboard/layout.tsx`
- Wraps all dashboard pages
- Checks for valid Supabase session server-side
- Redirects to `/login` if no session
- Renders a responsive nav:
  - Desktop: left sidebar with nav links
  - Mobile: bottom tab bar
  - Nav items: Workers, Jobs, Inbox, Settings icon
- Logout button

### 4. `/app/dashboard/page.tsx`
- Simple redirect to `/dashboard/workers`

### 5. Logout action
- Calls `supabase.auth.signOut()` and redirects to `/login`

## Styling Requirements
- Clean, professional, minimal
- Works well on both iPhone and desktop browser
- Large touch targets on mobile (min 44px)
- Use shadcn/ui `Card`, `Button`, `Input` components
