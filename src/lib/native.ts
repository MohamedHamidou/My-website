import { App } from '@capacitor/app'
import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core'
import { SplashScreen } from '@capacitor/splash-screen'

import { supabase } from './supabase'

export const NATIVE_AUTH_REDIRECT = 'com.pocketeye.app://auth/callback'

type BackHandler = () => boolean

const backHandlers: BackHandler[] = []

export function isNativeApp() {
  return Capacitor.isNativePlatform()
}

export function registerNativeBackHandler(handler: BackHandler) {
  backHandlers.push(handler)
  return () => {
    const index = backHandlers.indexOf(handler)
    if (index >= 0) backHandlers.splice(index, 1)
  }
}

export async function syncNativeTheme() {
  if (!isNativeApp()) return

  const isDark = document.documentElement.classList.contains('dark')
  try {
    await SystemBars.setStyle({
      style: isDark ? SystemBarsStyle.Dark : SystemBarsStyle.Light,
    })
  } catch {
    // SystemBars is unavailable on older WebViews; the app still works.
  }
}

function readAuthTokens(url: string) {
  const parsed = new URL(url)
  const hash = new URLSearchParams(parsed.hash.replace(/^#/, ''))
  const accessToken =
    hash.get('access_token') ?? parsed.searchParams.get('access_token')
  const refreshToken =
    hash.get('refresh_token') ?? parsed.searchParams.get('refresh_token')
  const code = parsed.searchParams.get('code')
  return { accessToken, refreshToken, code }
}

async function handleAuthCallback(url: string) {
  if (!url.startsWith(NATIVE_AUTH_REDIRECT)) return

  const { accessToken, refreshToken, code } = readAuthTokens(url)
  try {
    if (accessToken && refreshToken) {
      await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
    } else if (code) {
      await supabase.auth.exchangeCodeForSession(code)
    }
  } catch (error) {
    console.error('Could not finish signing in from the email link.', error)
  }
}

export async function initNativeApp() {
  if (!isNativeApp()) return

  document.documentElement.classList.add('native-app')
  await syncNativeTheme()

  try {
    await SplashScreen.hide()
  } catch {
    // The splash screen may already be hidden.
  }

  App.addListener('backButton', ({ canGoBack }) => {
    for (let index = backHandlers.length - 1; index >= 0; index -= 1) {
      if (backHandlers[index]()) return
    }

    if (canGoBack) {
      window.history.back()
    } else {
      void App.exitApp()
    }
  })

  App.addListener('appUrlOpen', ({ url }) => {
    void handleAuthCallback(url)
  })

  const launchUrl = await App.getLaunchUrl()
  if (launchUrl?.url) await handleAuthCallback(launchUrl.url)
}
