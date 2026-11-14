import { useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Sheet } from '@/components/ui/sheet'
import { useMyHome } from '@/hooks/useHome'
import { useConfirm } from '@/lib/confirm-context'
import {
  useCreateInventoryItem,
  useDeleteInventoryItem,
  useUpdateInventoryItem,
} from '@/hooks/useInventoryItems'
import {
  formatQuantity,
  inventoryCategories,
  inventoryLocations,
  inventoryUnits,
  parseQuantity,
} from '@/lib/inventory'
import type { InventoryCategory, InventoryItem } from '@/types/db'

interface ItemSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: InventoryItem | null
}

export function ItemSheet({ open, onOpenChange, item }: ItemSheetProps) {
  const { t } = useTranslation()
  const myHome = useMyHome()
  const home = myHome.data?.home
  const create = useCreateInventoryItem()
  const update = useUpdateInventoryItem()
  const remove = useDeleteInventoryItem()
  const confirm = useConfirm()

  const [name, setName] = useState(item?.name ?? '')
  const [category, setCategory] = useState<InventoryCategory>(
    item?.category ?? 'kitchen',
  )
  const [quantity, setQuantity] = useState(() =>
    item ? formatQuantity(item.quantity) : '0',
  )
  const [unitChoice, setUnitChoice] = useState(() => {
    if (!item) return 'pcs'
    return inventoryUnits.some((option) => option.value === item.unit)
      ? item.unit
      : '__other'
  })
  const [customUnit, setCustomUnit] = useState(() =>
    item && !inventoryUnits.some((option) => option.value === item.unit)
      ? item.unit
      : '',
  )
  const [threshold, setThreshold] = useState(() =>
    item ? formatQuantity(item.min_threshold) : '0',
  )
  const [locationChoice, setLocationChoice] = useState(() => {
    if (!item) return ''
    return inventoryLocations.some((option) => option.value === item.location)
      ? item.location
      : '__other'
  })
  const [customLocation, setCustomLocation] = useState(() =>
    item &&
    !inventoryLocations.some((option) => option.value === item.location)
      ? item.location
      : '',
  )
  const [shareOverride, setShareOverride] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)

  const shared =
    shareOverride ?? (item ? Boolean(item.is_common) : Boolean(home))

  const isPending = create.isPending || update.isPending || remove.isPending

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()

    const trimmed = name.trim()
    if (trimmed.length < 2) {
      setError(t('inventory.nameError'))
      return
    }

    const parsedQuantity = parseQuantity(quantity)
    if (parsedQuantity === null) {
      setError(t('inventory.quantityError'))
      return
    }

    const parsedThreshold = parseQuantity(threshold)
    if (parsedThreshold === null) {
      setError(t('inventory.quantityError'))
      return
    }

    const selectedUnit =
      unitChoice === '__other' ? customUnit.trim() : unitChoice
    if (!selectedUnit) {
      setError(t('inventory.unitError'))
      return
    }

    const selectedLocation =
      locationChoice === '__other' ? customLocation.trim() : locationChoice
    if (locationChoice === '__other' && !selectedLocation) {
      setError(t('inventory.locationError'))
      return
    }

    const shareWithHome = home ? shared : Boolean(item?.is_common)
    const sharedHomeId = home?.id ?? item?.home_id ?? null
    const payload = {
      name: trimmed,
      category,
      quantity: parsedQuantity,
      unit: selectedUnit,
      min_threshold: parsedThreshold,
      location: selectedLocation,
      home_id: shareWithHome ? sharedHomeId : null,
      is_common: shareWithHome,
    }

    try {
      if (item) {
        await update.mutateAsync({ id: item.id, ...payload })
      } else {
        await create.mutateAsync(payload)
      }
      onOpenChange(false)
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : t('inventory.saveError'),
      )
    }
  }

  async function onDelete() {
    if (!item) return
    const confirmed = await confirm({
      title: t('inventory.deleteItem'),
      description: t('inventory.confirmDelete', { name: item.name }),
      confirmLabel: t('inventory.deleteItem'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    })
    if (!confirmed) return

    try {
      await remove.mutateAsync(item.id)
      onOpenChange(false)
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : t('inventory.saveError'),
      )
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t(item ? 'inventory.editItem' : 'inventory.addItem')}
    >
      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <div className="space-y-2">
          <label htmlFor="item-name" className="text-sm font-medium">
            {t('inventory.name')}
          </label>
          <Input
            id="item-name"
            autoComplete="off"
            placeholder={t('inventory.namePlaceholder')}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="item-category" className="text-sm font-medium">
            {t('inventory.category')}
          </label>
          <Select
            id="item-category"
            value={category}
            onChange={(event) =>
              setCategory(event.target.value as InventoryCategory)
            }
          >
            {inventoryCategories.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.labelKey)}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label htmlFor="item-quantity" className="text-sm font-medium">
              {t('inventory.quantity')}
            </label>
            <Input
              id="item-quantity"
              inputMode="decimal"
              autoComplete="off"
              className="tabular-nums"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="item-unit" className="text-sm font-medium">
              {t('inventory.unit')}
            </label>
            <Select
              id="item-unit"
              value={unitChoice}
              onChange={(event) => setUnitChoice(event.target.value)}
            >
              {inventoryUnits.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </option>
              ))}
              <option value="__other">{t('inventory.unitOther')}</option>
            </Select>
            {unitChoice === '__other' ? (
              <Input
                aria-label={t('inventory.customUnit')}
                placeholder={t('inventory.customUnit')}
                value={customUnit}
                onChange={(event) => setCustomUnit(event.target.value)}
              />
            ) : null}
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="item-threshold" className="text-sm font-medium">
            {t('inventory.minThreshold')}
          </label>
          <Input
            id="item-threshold"
            inputMode="decimal"
            autoComplete="off"
            className="tabular-nums"
            value={threshold}
            onChange={(event) => setThreshold(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            {t('inventory.minThresholdHint')}
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="item-location" className="text-sm font-medium">
            {t('inventory.location')}
          </label>
          <Select
            id="item-location"
            value={locationChoice}
            onChange={(event) => setLocationChoice(event.target.value)}
          >
            {inventoryLocations.map((option) => (
              <option key={option.value || 'none'} value={option.value}>
                {t(option.labelKey)}
              </option>
            ))}
            <option value="__other">{t('inventory.locationOther')}</option>
          </Select>
          {locationChoice === '__other' ? (
            <Input
              aria-label={t('inventory.customLocation')}
              placeholder={t('inventory.customLocation')}
              value={customLocation}
              onChange={(event) => setCustomLocation(event.target.value)}
            />
          ) : null}
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

        <div className="flex items-center gap-2 pt-1">
          <Button type="submit" className="flex-1" disabled={isPending}>
            {isPending ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : null}
            {t('entries.save')}
          </Button>
          {item ? (
            <Button
              type="button"
              variant="outline"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={isPending}
              onClick={() => void onDelete()}
              aria-label={t('inventory.deleteItem')}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          ) : null}
        </div>
      </form>
    </Sheet>
  )
}
