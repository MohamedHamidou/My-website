import { useCallback, useSyncExternalStore } from 'react'

import { syncNativeTheme } from '@/lib/native'

export type Theme = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

function getSystemPreference(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system'
  const stored = window.localStorage.getItem('theme')
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored
  }
  return 'system'
}

let currentTheme: Theme = getStoredTheme()
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach((listener) => listener())
}

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return
  const resolved: ResolvedTheme =
    theme === 'system' ? getSystemPreference() : theme
  const root = document.documentElement
  root.classList.toggle('dark', resolved === 'dark')
  root.style.colorScheme = resolved
  void syncNativeTheme()
}

if (typeof window !== 'undefined') {
  applyTheme(currentTheme)

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const handleMediaChange = () => {
    if (currentTheme === 'system') {
      applyTheme('system')
      notify()
    }
  }

  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handleMediaChange)
  } else {
    // Fallback for older environments
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(mediaQuery as any).addListener?.(handleMediaChange)
  }

  window.addEventListener('storage', (event) => {
    if (event.key === 'theme') {
      const val = event.newValue as Theme | null
      if (val === 'light' || val === 'dark' || val === 'system') {
        currentTheme = val
        applyTheme(val)
        notify()
      }
    }
  })
}

function subscribe(callback: () => void) {
  listeners.add(callback)
  return () => {
    listeners.delete(callback)
  }
}

export function useTheme() {
  const theme = useSyncExternalStore(
    subscribe,
    () => currentTheme,
    () => 'system' as Theme,
  )

  const resolvedTheme: ResolvedTheme =
    theme === 'system' ? getSystemPreference() : theme

  const setTheme = useCallback((nextTheme: Theme) => {
    currentTheme = nextTheme
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('theme', nextTheme)
    }
    applyTheme(nextTheme)
    notify()
  }, [])

  const toggleTheme = useCallback(() => {
    const currentResolved =
      currentTheme === 'system' ? getSystemPreference() : currentTheme
    const next: Theme = currentResolved === 'dark' ? 'light' : 'dark'
    setTheme(next)
  }, [setTheme])

  return {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
  }
}
