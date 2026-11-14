import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet } from '@/components/ui/sheet'
import { useAcceptInvite } from '@/hooks/useHome'

interface JoinHomeSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialCode?: string
}

export function JoinHomeSheet({
  open,
  onOpenChange,
  initialCode = '',
}: JoinHomeSheetProps) {
  const { t } = useTranslation()
  const acceptInvite = useAcceptInvite()
  const [code, setCode] = useState(initialCode)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const cleanCode = code.trim().toUpperCase()
    if (cleanCode.length < 4) {
      setError(t('home.errorEmptyCode'))
      return
    }

    try {
      await acceptInvite.mutateAsync(cleanCode)
      setCode('')
      setError(null)
      onOpenChange(false)
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message ??
            'Invalid or expired invitation code'
      setError(message)
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t('home.joinTitle')}
      description={t('home.joinSubtitle')}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="inviteCode" className="text-sm font-medium">
            {t('home.codeLabel')}
          </label>
          <Input
            id="inviteCode"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase())
              if (error) setError(null)
            }}
            placeholder={t('home.codePlaceholder')}
            maxLength={12}
            className="font-mono text-center text-lg tracking-widest uppercase"
          />
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={acceptInvite.isPending}
        >
          {acceptInvite.isPending ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : null}
          {t('home.joinSubmit')}
        </Button>
      </form>
    </Sheet>
  )
}

