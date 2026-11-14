import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { FullPageLoader } from '@/components/FullPageLoader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useAuth } from '@/hooks/useAuth'
import { useProfile, useUpdateProfile } from '@/hooks/useProfile'
import { currencies, defaultCurrency, getCurrency } from '@/lib/currencies'
import { monthStartOptions, ordinal } from '@/lib/dates'

const onboardingSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  currency: z.string().regex(/^[A-Z]{3}$/, 'Choose a currency'),
  monthStartDay: z.string().regex(/^\d{1,2}$/, 'Choose a day'),
})

type OnboardingValues = z.infer<typeof onboardingSchema>

export function OnboardingPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const profile = useProfile()
  const update = useUpdateProfile()

  const data = profile.data

  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<OnboardingValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      name: data?.name ?? '',
      currency: data?.currency ?? defaultCurrency,
      monthStartDay: String(data?.month_start_day ?? 1),
    },
  })

  const currencyValue = useWatch({ control, name: 'currency' })
  const dayValue = useWatch({ control, name: 'monthStartDay' })

  if (!data) return <FullPageLoader />

  const selectedCurrency = getCurrency(currencyValue || defaultCurrency)
  const selectedDay = Number(dayValue) || 1

  async function onSubmit(values: OnboardingValues) {
    try {
      await update.mutateAsync({
        name: values.name.trim(),
        currency: values.currency,
        month_start_day: Number(values.monthStartDay),
        onboarding_completed: true,
      })
      navigate('/dashboard', { replace: true })
    } catch (error) {
      setError('root', {
        message:
          error instanceof Error ? error.message : 'Could not save your setup',
      })
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-semibold">{t('onboarding.title')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('onboarding.subtitle')}
            </p>
          </div>

          <form
            className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
          >
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                {t('onboarding.name')}
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
                {t('onboarding.currency')}
              </label>
              <Select id="currency" {...register('currency')}>
                {currencies.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.symbol} {currency.code} — {currency.name}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-muted-foreground">
                {t('onboarding.currencyPreview', {
                  symbol: selectedCurrency.symbol,
                  code: selectedCurrency.code,
                })}
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="monthStartDay" className="text-sm font-medium">
                {t('onboarding.monthStartDay')}
              </label>
              <Select id="monthStartDay" {...register('monthStartDay')}>
                {monthStartOptions.map((day) => (
                  <option key={day} value={day}>
                    {t('onboarding.dayOption', { day, ordinal: ordinal(day) })}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-muted-foreground">
                {t('onboarding.monthStartHelp', { ordinal: ordinal(selectedDay) })}
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

            <Button
              type="submit"
              className="w-full"
              disabled={update.isPending}
            >
              {update.isPending ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : null}
              {t('onboarding.finish')}
            </Button>
          </form>

          <div className="mt-5 text-center">
            <button
              type="button"
              className="text-sm text-muted-foreground underline-offset-4 hover:underline"
              onClick={() => void signOut()}
            >
              {t('auth.switchAccount')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
