import { useEffect, useState } from 'react'
import { Check, Monitor, Moon, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Select } from '@/components/ui/select'
import { useTheme, type Theme } from '@/hooks/useTheme'
import { cn } from '@/lib/utils'

export function ThemeCard() {
  const { t } = useTranslation()
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [justSaved, setJustSaved] = useState(false)

  useEffect(() => {
    if (!justSaved) return
    const timer = setTimeout(() => setJustSaved(false), 2000)
    return () => clearTimeout(timer)
  }, [justSaved])

  function handleSelect(nextTheme: Theme) {
    if (nextTheme === theme) return
    setTheme(nextTheme)
    setJustSaved(true)
  }

  const options: Array<{
    value: Theme
    label: string
    icon: typeof Sun
    renderPreview: () => React.ReactNode
  }> = [
    {
      value: 'light',
      label: t('theme.light'),
      icon: Sun,
      renderPreview: () => (
        <div className="relative flex h-12 w-full flex-col justify-between overflow-hidden rounded-md border border-[#e7e2d9] bg-[#faf7f2] p-1.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="size-2 rounded-full bg-[#0f766e]" />
            <div className="h-1.5 w-7 rounded-full bg-[#e7e2d9]" />
          </div>
          <div className="rounded border border-[#e7e2d9] bg-white p-1">
            <div className="h-1 w-8 rounded-full bg-[#1f2937]/30" />
          </div>
        </div>
      ),
    },
    {
      value: 'dark',
      label: t('theme.dark'),
      icon: Moon,
      renderPreview: () => (
        <div className="relative flex h-12 w-full flex-col justify-between overflow-hidden rounded-md border border-[#1f332f] bg-[#0b1412] p-1.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="size-2 rounded-full bg-[#2dd4bf]" />
            <div className="h-1.5 w-7 rounded-full bg-[#1f332f]" />
          </div>
          <div className="rounded border border-[#1f332f] bg-[#12201d] p-1">
            <div className="h-1 w-8 rounded-full bg-[#ecfdf5]/40" />
          </div>
        </div>
      ),
    },
    {
      value: 'system',
      label: t('theme.system'),
      icon: Monitor,
      renderPreview: () => (
        <div className="relative flex h-12 w-full overflow-hidden rounded-md border border-border shadow-2xs">
          {/* Light half */}
          <div className="flex flex-1 flex-col justify-between bg-[#faf7f2] p-1.5">
            <span className="size-2 rounded-full bg-[#0f766e]" />
            <div className="h-1 w-5 rounded-full bg-[#1f2937]/30" />
          </div>
          {/* Dark half */}
          <div className="flex flex-1 flex-col justify-between bg-[#0b1412] p-1.5">
            <span className="ml-auto size-2 rounded-full bg-[#2dd4bf]" />
            <div className="ml-auto h-1 w-5 rounded-full bg-[#ecfdf5]/40" />
          </div>
        </div>
      ),
    },
  ]

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-4">
      <div>
        <h2 className="text-sm font-semibold">{t('theme.cardTitle')}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {t('theme.cardDescription')}
        </p>
      </div>

      <div
        role="radiogroup"
        aria-label={t('theme.cardTitle')}
        className="grid grid-cols-3 gap-2.5"
      >
        {options.map((option) => {
          const isSelected = theme === option.value
          const Icon = option.icon

          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => handleSelect(option.value)}
              className={cn(
                'group relative flex flex-col items-center gap-2 rounded-xl border p-2.5 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                isSelected
                  ? 'border-primary bg-primary/5 text-foreground ring-1 ring-primary/40'
                  : 'border-border bg-card text-muted-foreground hover:border-border/90 hover:bg-muted/40 hover:text-foreground',
              )}
            >
              <div className="w-full transition-transform group-hover:scale-[1.02]">
                {option.renderPreview()}
              </div>

              <div className="flex w-full items-center justify-between px-0.5">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Icon className="size-3.5" aria-hidden="true" />
                  {option.label}
                </span>
                {isSelected ? (
                  <span className="flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="size-2.5 stroke-[3]" aria-hidden="true" />
                  </span>
                ) : (
                  <span className="size-4 rounded-full border border-border" />
                )}
              </div>
            </button>
          )
        })}
      </div>

      <div className="space-y-2">
        <label htmlFor="theme-select" className="text-sm font-medium">
          {t('theme.selectLabel')}
        </label>
        <Select
          id="theme-select"
          value={theme}
          onChange={(event) => handleSelect(event.target.value as Theme)}
        >
          <option value="light">
            {t('theme.light')} — {t('theme.lightDesc')}
          </option>
          <option value="dark">
            {t('theme.dark')} — {t('theme.darkDesc')}
          </option>
          <option value="system">
            {t('theme.system')} — {t('theme.systemDesc')}
          </option>
        </Select>
        <p className="text-xs text-muted-foreground">
          {theme === 'system'
            ? t('theme.systemActiveHint', { mode: resolvedTheme })
            : t('theme.modeHint', { mode: theme })}
        </p>
      </div>

      <div className="flex items-center justify-between border-t border-border/70 pt-2 text-xs">
        <span className="text-muted-foreground">
          {t('theme.currentlyActive')}:{' '}
          <strong className="font-semibold capitalize text-foreground">
            {resolvedTheme}
          </strong>
          {theme === 'system' ? ' (auto)' : ''}
        </span>

        {justSaved ? (
          <span className="flex items-center gap-1 font-medium text-success">
            <Check className="size-3.5" aria-hidden="true" />
            {t('theme.applied')}
          </span>
        ) : null}
      </div>
    </section>
  )
}

