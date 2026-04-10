'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <p className="text-2xl font-semibold mb-2">Something went wrong</p>
      <p className="text-muted-foreground text-sm mb-6 max-w-sm">
        {error.message ?? 'An unexpected error occurred. Please try again.'}
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  )
}
