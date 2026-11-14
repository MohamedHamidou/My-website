import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet } from '@/components/ui/sheet'
import { useCreateHome } from '@/hooks/useHome'

interface CreateHomeSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateHomeSheet({ open, onOpenChange }: CreateHomeSheetProps) {
  const { t } = useTranslation()
  const createHome = useCreateHome()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError(t('home.errorEmptyName'))
      return
    }

    try {
      await createHome.mutateAsync(trimmed)
      setName('')
      setError(null)
      onOpenChange(false)
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message ?? 'Could not create home'
      setError(message)
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t('home.createTitle')}
      description={t('home.createSubtitle')}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="homeName" className="text-sm font-medium">
            {t('home.homeName')}
          </label>
          <Input
            id="homeName"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              if (error) setError(null)
            }}
            placeholder={t('home.homeNamePlaceholder')}
          />
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={createHome.isPending}
        >
          {createHome.isPending ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : null}
          {t('home.createSubmit')}
        </Button>
      </form>
    </Sheet>
  )
}

