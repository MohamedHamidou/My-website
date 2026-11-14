import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'

import { FullPageLoader } from '@/components/FullPageLoader'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { isSupabaseConfigured } from '@/lib/supabase'

export function AuthGate() {
  const { session, loading } = useAuth()
  const profile = useProfile()
  const location = useLocation()

  if (loading) return <FullPageLoader />

  if (!session) {
    return (
      <Navigate
        to="/auth/sign-in"
        replace
        state={{ from: location.pathname + location.search }}
      />
    )
  }

  if (profile.isPending) return <FullPageLoader />

  if (profile.isError) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-warning/10 text-warning">
            <AlertTriangle className="size-6" aria-hidden="true" />
          </div>
          <h1 className="text-lg font-semibold">Profile could not load</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isSupabaseConfigured
              ? 'Make sure the database migration in db/migrations has been run in your Supabase project.'
              : 'Add your Supabase keys to the .env file, then run the migration in db/migrations.'}
          </p>
          <p className="mt-3 break-words rounded-md bg-muted px-3 py-2 text-left text-xs text-muted-foreground">
            {profile.error.message}
          </p>
        </div>
      </div>
    )
  }

  const onboarded = profile.data.onboarding_completed
  const onOnboarding = location.pathname === '/onboarding'

  if (!onboarded && !onOnboarding) {
    return <Navigate to="/onboarding" replace />
  }

  if (onboarded && onOnboarding) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
