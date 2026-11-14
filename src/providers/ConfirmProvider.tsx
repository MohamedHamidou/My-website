import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useTranslation } from 'react-i18next'

import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  ConfirmContext,
  type ConfirmFn,
  type ConfirmOptions,
} from '@/lib/confirm-context'

interface PendingConfirm extends ConfirmOptions {
  resolve: (value: boolean) => void
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const [pending, setPending] = useState<PendingConfirm | null>(null)
  const pendingRef = useRef<PendingConfirm | null>(null)

  useEffect(() => {
    pendingRef.current = pending
  }, [pending])

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      pendingRef.current?.resolve(false)
      setPending({ ...options, resolve })
    })
  }, [])

  const settle = useCallback((value: boolean) => {
    const current = pendingRef.current
    if (!current) return
    pendingRef.current = null
    setPending(null)
    current.resolve(value)
  }, [])

  const handleCancel = useCallback(() => settle(false), [settle])
  const handleConfirm = useCallback(() => settle(true), [settle])

  useEffect(() => {
    return () => {
      pendingRef.current?.resolve(false)
      pendingRef.current = null
    }
  }, [])

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog
        open={Boolean(pending)}
        title={pending?.title ?? ''}
        description={pending?.description}
        confirmLabel={pending?.confirmLabel ?? t('common.confirm')}
        cancelLabel={pending?.cancelLabel ?? t('common.cancel')}
        destructive={pending?.destructive ?? false}
        onCancel={handleCancel}
        onConfirm={handleConfirm}
      />
    </ConfirmContext.Provider>
  )
}
