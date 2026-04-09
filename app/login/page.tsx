'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const hasError = searchParams.get('error')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const trimmed = email.trim().toLowerCase()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmed)) {
      setError('Please enter a valid email address.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const origin = window.location.origin

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
        shouldCreateUser: false,
      },
    })

    setLoading(false)

    if (otpError) {
      setError(otpError.message)
    } else {
      setSent(true)
    }
  }

  if (sent) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-2xl">Check your email</CardTitle>
          <CardDescription>
            We sent a login link to <span className="font-medium text-foreground">{email}</span>.
            Tap the link to sign in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="w-full min-h-[44px]"
            onClick={() => { setSent(false); setEmail('') }}
          >
            Use a different email
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-2xl">Sign in</CardTitle>
        <CardDescription>
          Enter your email to receive a login link.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {(hasError || error) && (
            <p className="text-sm text-destructive rounded-md bg-destructive/10 px-3 py-2">
              {error ?? 'Login failed. Please try again.'}
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
              required
              className="min-h-[44px] text-base"
            />
          </div>
          <Button
            type="submit"
            className="w-full min-h-[44px] text-base"
            disabled={loading}
          >
            {loading ? 'Sending…' : 'Send login link'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  )
}
