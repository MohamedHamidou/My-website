import type { LucideIcon } from 'lucide-react'
import {
  Eye,
  LayoutDashboard,
  Package,
  PiggyBank,
  ReceiptText,
  Settings,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface NavItem {
  to: string
  labelKey: string
  icon: LucideIcon
}

const navItems: NavItem[] = [
  { to: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { to: '/expenses', labelKey: 'nav.expenses', icon: ReceiptText },
  { to: '/budgets', labelKey: 'nav.budgets', icon: PiggyBank },
  { to: '/inventory', labelKey: 'nav.inventory', icon: Package },
]

export function AppShell() {
  const { t } = useTranslation()

  return (
    <div className="min-h-dvh bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 pt-[var(--safe-top)] backdrop-blur">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Eye className="size-5" aria-hidden="true" />
            </span>
            <span className="font-heading text-lg font-semibold text-foreground">
              {t('app.name')}
            </span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            asChild
            aria-label={t('settings.title')}
          >
            <NavLink to="/settings">
              <Settings className="size-5" aria-hidden="true" />
            </NavLink>
          </Button>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-lg px-4 pb-28 pt-5">
        <Outlet />
      </main>

      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-[var(--safe-bottom)] backdrop-blur"
      >
        <div className="mx-auto grid max-w-lg grid-cols-4">
          {navItems.map(({ to, labelKey, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-medium transition-colors',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={cn('size-5', isActive && 'stroke-[2.4]')}
                    aria-hidden="true"
                  />
                  <span>{t(labelKey)}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
