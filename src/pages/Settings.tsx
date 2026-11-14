import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { Check, Loader2, LogOut } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { CategoryManager } from '@/components/settings/CategoryManager'
import { HomeManager } from '@/components/settings/HomeManager'
import { ThemeCard } from '@/components/theme/ThemeCard'
import { useAuth } from '@/hooks/useAuth'
import { useProfile, useUpdateProfile } from '@/hooks/useProfile'
import { currencies } from '@/lib/currencies'
import { monthStartOptions, ordinal } from '@/lib/dates'

const settingsSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  currency: z.string().regex(/^[A-Z]{3}$/, 'Choose a currency'),
  monthStartDay: z.string().regex(/^\d{1,2}$/, 'Choose a day'),
  locale: z.string().min(2),
})

type SettingsValues = z.infer<typeof settingsSchema>

export function SettingsPage() {
  const { t } = useTranslation()
  const { user, signOut } = useAuth()
  const profile = useProfile()
  const update = useUpdateProfile()
  const [saved, setSaved] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<SettingsValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: '',
      currency: 'BDT',
      monthStartDay: '1',
      locale: 'en',
    },
  })

  useEffect(() => {
    if (!profile.data) return
    reset({
      name: profile.data.name,
      currency: profile.data.currency,
      monthStartDay: String(profile.data.month_start_day),
      locale: profile.data.locale,
    })
  }, [profile.data, reset])

  useEffect(() => {
    if (!saved) return
    const timer = setTimeout(() => setSaved(false), 2500)
    return () => clearTimeout(timer)
  }, [saved])

  if (!profile.data) return null

  const name = profile.data.name || user?.email || 'Pocket Eye user'
  const initial = name.trim().charAt(0).toUpperCase()

  async function onSubmit(values: SettingsValues) {
    try {
      await update.mutateAsync({
        name: values.name.trim(),
        currency: values.currency,
        month_start_day: Number(values.monthStartDay),
        locale: values.locale,
      })
      setSaved(true)
    } catch (error) {
      setError('root', {
        message:
          error instanceof Error ? error.message : 'Could not save changes',
      })
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">{t('settings.title')}</h1>

      <section className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
        <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 font-heading text-lg font-semibold text-primary">
          {initial}
        </span>
        <div className="min-w-0">
          <p className="truncate font-medium">{name}</p>
          <p className="truncate text-sm text-muted-foreground">
            {profile.data.email}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t('settings.memberSince', {
              date: format(new Date(profile.data.created_at), 'MMM yyyy'),
            })}
          </p>
        </div>
      </section>

      <form
        className="space-y-4 rounded-xl border border-border bg-card p-4"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <h2 className="text-sm font-semibold">{t('settings.preferences')}</h2>

        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">
            {t('settings.name')}
          </label>
          <Input
            id="name"
            autoComplete="name"
            aria-invalid={Boolean(errors.name)}
            {...register('name')}
          />
          {errors.name ? (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="currency" className="text-sm font-medium">
            {t('settings.currency')}
          </label>
          <Select id="currency" {...register('currency')}>
            {currencies.map((currency) => (
              <option key={currency.code} value={currency.code}>
                {currency.symbol} {currency.code} — {currency.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <label htmlFor="monthStartDay" className="text-sm font-medium">
            {t('settings.monthStartDay')}
          </label>
          <Select id="monthStartDay" {...register('monthStartDay')}>
            {monthStartOptions.map((day) => (
              <option key={day} value={day}>
                {t('onboarding.dayOption', { day, ordinal: ordinal(day) })}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <label htmlFor="locale" className="text-sm font-medium">
            {t('settings.language')}
          </label>
          <Select id="locale" {...register('locale')}>
            <option value="en">English</option>
          </Select>
          <p className="text-xs text-muted-foreground">
            {t('settings.languageHint')}
          </p>
        </div>

        {errors.root ? (
          <p
            className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
            role="alert"
          >
            {errors.root.message}
          </p>
        ) : null}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={update.isPending}>
            {update.isPending ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : null}
            {t('settings.save')}
          </Button>
          {saved ? (
            <span className="flex items-center gap-1 text-sm text-success">
              <Check className="size-4" aria-hidden="true" />
              {t('settings.saved')}
            </span>
          ) : null}
        </div>
      </form>

      <ThemeCard />

      <CategoryManager />

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">{t('settings.account')}</h2>
        <Button
          variant="outline"
          className="mt-3 w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => void signOut()}
        >
          <LogOut aria-hidden="true" />
          {t('auth.signOut')}
        </Button>
      </section>

      <HomeManager />
    </div>
  )
}
