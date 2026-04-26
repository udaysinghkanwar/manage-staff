'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const DEV_BYPASS = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const hasError = searchParams.get('error')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const trimmed = email.trim().toLowerCase()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmed)) {
      setError('Please enter a valid email address.')
      return
    }
    if (!password) {
      setError('Please enter your password.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: trimmed,
      password,
    })

    setLoading(false)

    if (authError) {
      setError('Invalid email or password.')
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-2xl">Sign in</CardTitle>
        <CardDescription>Enter your work email and password.</CardDescription>
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
              name="email"
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
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="min-h-[44px] text-base"
            />
          </div>
          <Button
            type="submit"
            className="w-full min-h-[44px] text-base"
            disabled={loading}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>

          {DEV_BYPASS && (
            <div className="pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                className="w-full min-h-[44px] text-xs text-muted-foreground"
                onClick={() => router.push('/dashboard')}
              >
                [DEV] Skip login → Dashboard
              </Button>
            </div>
          )}
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
