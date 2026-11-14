import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, MailCheck } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'
import { getAuthErrorMessage } from '@/lib/auth-errors'
import { NATIVE_AUTH_REDIRECT, isNativeApp } from '@/lib/native'
import { supabase } from '@/lib/supabase'

const signUpSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  email: z.email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type SignUpValues = z.infer<typeof signUpSchema>

export function SignUpPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { session, loading } = useAuth()
  const [sentTo, setSentTo] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: '', email: '', password: '' },
  })

  if (!loading && session) {
    return <Navigate to="/dashboard" replace />
  }

  async function onSubmit(values: SignUpValues) {
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: { name: values.name.trim() },
        emailRedirectTo: isNativeApp()
          ? NATIVE_AUTH_REDIRECT
          : `${window.location.origin}/auth/sign-in`,
      },
    })

    if (error) {
      setError('root', { message: getAuthErrorMessage(error) })
      return
    }

    if (data.session) {
      navigate('/onboarding', { replace: true })
      return
    }

    setSentTo(values.email)
  }

  if (sentTo) {
    return (
      <AuthLayout
        title={t('auth.checkEmailTitle')}
        subtitle={t('auth.checkEmailSubtitle')}
        footer={
          <p>
            <Link
              to="/auth/sign-in"
              className="font-medium text-primary hover:underline"
            >
              {t('auth.backToSignIn')}
            </Link>
          </p>
        }
      >
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MailCheck className="size-6" aria-hidden="true" />
          </div>
          <p className="text-sm text-muted-foreground">
            {t('auth.confirmSent', { email: sentTo })}
          </p>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title={t('auth.signUpTitle')}
      subtitle={t('auth.signUpSubtitle')}
      footer={
        <p>
          {t('auth.haveAccount')}{' '}
          <Link
            to="/auth/sign-in"
            className="font-medium text-primary hover:underline"
          >
            {t('auth.signIn')}
          </Link>
        </p>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">
            {t('auth.name')}
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
          <label htmlFor="email" className="text-sm font-medium">
            {t('auth.email')}
          </label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            aria-invalid={Boolean(errors.email)}
            {...register('email')}
          />
          {errors.email ? (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium">
            {t('auth.password')}
          </label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.password)}
            {...register('password')}
          />
          {errors.password ? (
            <p className="text-xs text-destructive">
              {errors.password.message}
            </p>
          ) : null}
        </div>

        {errors.root ? (
          <p
            className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
            role="alert"
          >
            {errors.root.message}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : null}
          {t('auth.createAccount')}
        </Button>
      </form>
    </AuthLayout>
  )
}
