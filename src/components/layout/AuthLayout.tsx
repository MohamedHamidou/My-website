import type { ReactNode } from 'react'
import { Eye } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { isSupabaseConfigured } from '@/lib/supabase'

interface AuthLayoutProps {
  title: string
  subtitle: string
  children: ReactNode
  footer?: ReactNode
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center text-center">
            <span className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Eye className="size-7" aria-hidden="true" />
            </span>
            <span className="font-heading text-xl font-semibold">
              {t('app.name')}
            </span>
            <h1 className="mt-6 text-2xl font-semibold">{title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </div>

          {!isSupabaseConfigured ? (
            <div
              className="mb-4 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning"
              role="alert"
            >
              Supabase is not configured. Add VITE_SUPABASE_URL and
              VITE_SUPABASE_ANON_KEY to your .env file to sign in.
            </div>
          ) : null}

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            {children}
          </div>

          {footer ? (
            <div className="mt-5 text-center text-sm text-muted-foreground">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
