import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet } from '@/components/ui/sheet'
import { useMyHome } from '@/hooks/useHome'
import { useCreateShoppingItem } from '@/hooks/useShoppingItems'

interface ShoppingItemSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ShoppingItemSheet({
  open,
  onOpenChange,
}: ShoppingItemSheetProps) {
  const { t } = useTranslation()
  const myHome = useMyHome()
  const home = myHome.data?.home
  const create = useCreateShoppingItem()

  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [shareOverride, setShareOverride] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)

  const shared = shareOverride ?? Boolean(home)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()

    const trimmed = name.trim()
    if (trimmed.length < 2) {
      setError(t('inventory.nameError'))
      return
    }

    const shareWithHome = Boolean(home && shared)

    try {
      await create.mutateAsync({
        name: trimmed,
        quantity: quantity.trim(),
        home_id: shareWithHome ? home!.id : null,
        is_common: shareWithHome,
      })
      onOpenChange(false)
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : t('inventory.saveError'),
      )
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t('inventory.shopping.add')}
    >
      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <div className="space-y-2">
          <label htmlFor="shopping-name" className="text-sm font-medium">
            {t('inventory.shopping.name')}
          </label>
          <Input
            id="shopping-name"
            autoComplete="off"
            placeholder={t('inventory.shopping.namePlaceholder')}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="shopping-quantity" className="text-sm font-medium">
            {t('inventory.shopping.quantity')}
          </label>
          <Input
            id="shopping-quantity"
            autoComplete="off"
            placeholder={t('inventory.shopping.quantityPlaceholder')}
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            {t('inventory.shopping.quantityHint')}
          </p>
        </div>

        {home ? (
          <div className="space-y-1.5 rounded-md border border-border bg-muted/40 p-3">
            <label className="flex items-start gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={shared}
                onChange={(event) => {
                  setShareOverride(event.target.checked)
                  setError(null)
                }}
                className="mt-0.5 size-4 shrink-0 accent-primary"
              />
              <span>{t('inventory.shareWithHome')}</span>
            </label>
            <p className="text-xs text-muted-foreground">
              {t('inventory.sharedHint', { home: home.name })}
            </p>
          </div>
        ) : null}

        {error ? (
          <p
            className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={create.isPending}>
          {create.isPending ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : null}
          {t('inventory.shopping.add')}
        </Button>
      </form>
    </Sheet>
  )
}
